"""Transfer-learn MobileNetV3-Small and write logits (no softmax).

Backbone weights: keras.applications.MobileNetV3Small(weights='imagenet'),
Apache-2.0. A CPU machine can run this. See training/README.md.

Images are the oriented 224px PNGs from prepare_data.py. The loader does not
decode the original JPEG, so EXIF orientation cannot be skipped. The sample
list is shuffled before from_tensor_slices. Training then applies flip,
scale-and-crop, rotation, brightness, and contrast. Class weights are
inverse frequency, capped at 10. dataset.cache() sits on the deterministic
decode, before augmentation.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from manifest import ROOT, load_manifest
from preprocess import load_oriented_rgb, preprocess_rgb_uint8

DATA_DIR = ROOT / "training" / "data"
ARTIFACTS = ROOT / "training" / "artifacts"
CLASS_WEIGHT_CAP = 10.0


def balanced_class_weights(labels: list[int], num_classes: int) -> dict[int, float]:
    """Inverse-frequency weights with mean 1 over classes that have images."""
    if num_classes < 1:
        raise ValueError("num_classes must be positive")
    counts = [0] * num_classes
    for label in labels:
        if label < 0 or label >= num_classes:
            raise ValueError(f"label {label} is outside 0..{num_classes - 1}")
        counts[label] += 1
    present = sum(1 for count in counts if count > 0)
    total = sum(counts)
    if present == 0 or total == 0:
        raise ValueError("no training labels")
    return {
        index: (min(CLASS_WEIGHT_CAP, total / (present * count)) if count else 0.0)
        for index, count in enumerate(counts)
    }


def _load_splits() -> dict:
    path = DATA_DIR / "splits.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _image_path(row: dict) -> Path:
    relative = row.get("prepared_file") or row["file"]
    return DATA_DIR / relative


def _dataset(split_name: str, class_index: dict[str, int], image_size: int):
    import numpy as np
    import tensorflow as tf

    splits = _load_splits()
    samples = []
    for row in splits[split_name]:
        if row.get("downloaded") is False:
            continue
        path = _image_path(row)
        if not path.is_file():
            continue
        if row["class_id"] not in class_index:
            raise ValueError(f"split row class {row['class_id']} is not in labels.json")
        samples.append(row)
    # The split file is grouped by class. Shuffle the whole list here so
    # from_tensor_slices is not class-sorted. A later shuffle(1000) only
    # mixes a window of that sorted order.
    random.Random(f"42:{split_name}").shuffle(samples)
    paths = [str(_image_path(row)) for row in samples]
    labels = [class_index[row["class_id"]] for row in samples]

    def load(path, label):
        def _read(path_bytes):
            if isinstance(path_bytes, np.ndarray):
                path_bytes = path_bytes.item()
            text = path_bytes.decode("utf-8") if not isinstance(path_bytes, str) else path_bytes
            rgb = load_oriented_rgb(Path(text))
            return preprocess_rgb_uint8(rgb, image_size)

        image = tf.numpy_function(_read, [path], tf.float32)
        image.set_shape([image_size, image_size, 3])
        return image, label

    dataset = tf.data.Dataset.from_tensor_slices((paths, labels))
    dataset = dataset.map(load, num_parallel_calls=tf.data.AUTOTUNE)
    dataset = dataset.cache()
    return dataset, labels


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune MobileNetV3-Small on the open-license split")
    parser.add_argument("--epochs-frozen", type=int, default=8)
    parser.add_argument("--epochs-finetune", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--image-size", type=int, default=224)
    args = parser.parse_args()

    import tensorflow as tf

    manifest = load_manifest()
    class_index = {item["id"]: item["index"] for item in manifest["classes"]}
    num_classes = len(class_index)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    train_ds, train_labels = _dataset("train", class_index, args.image_size)
    val_ds, val_labels = _dataset("val", class_index, args.image_size)
    train_count = len(train_labels)
    val_count = len(val_labels)
    if train_count == 0 or val_count == 0:
        raise SystemExit("train or val split is empty. Run fetch, dedup, and split first.")

    rotation = tf.keras.layers.RandomRotation(15.0 / 360.0, fill_mode="reflect")

    def augment(image, label):
        image = tf.image.random_flip_left_right(image)
        # Scale, then crop back to 224. Rotation is about +/- 15 degrees.
        scale = tf.random.uniform([], 1.0, 1.25)
        side = tf.cast(tf.round(float(args.image_size) * scale), tf.int32)
        image = tf.image.resize(image, [side, side])
        image = tf.image.random_crop(image, [args.image_size, args.image_size, 3])
        image = rotation(image[None, ...], training=True)[0]
        image = tf.image.random_brightness(image, 0.12)
        image = tf.image.random_contrast(image, 0.85, 1.15)
        return tf.clip_by_value(image, -1.0, 1.0), label

    class_weight = balanced_class_weights(train_labels, num_classes)
    train_ds = train_ds.map(augment, num_parallel_calls=tf.data.AUTOTUNE)
    train_ds = train_ds.batch(args.batch_size).prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.batch(args.batch_size).prefetch(tf.data.AUTOTUNE)

    base_kwargs = dict(
        input_shape=(args.image_size, args.image_size, 3),
        include_top=False,
        weights="imagenet",
        pooling="avg",
    )
    try:
        base = tf.keras.applications.MobileNetV3Small(**base_kwargs, include_preprocessing=False)
    except TypeError as error:
        raise SystemExit(
            "MobileNetV3Small in this Keras build has no include_preprocessing=False flag. "
            "Use TensorFlow >= 2.16 so the exported network reads MobileNetV3-normalized "
            "floats instead of baking a second preprocess into the graph. "
            f"Original error: {error}"
        ) from error
    base.trainable = False
    inputs = tf.keras.Input(shape=(args.image_size, args.image_size, 3))
    embedding = base(inputs, training=False)
    dropped = tf.keras.layers.Dropout(0.2)(embedding)
    logits = tf.keras.layers.Dense(num_classes, name="logits")(dropped)
    model = tf.keras.Model(inputs, logits, name="mobilenet_v3_small_mushrooms")
    loss = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss=loss, metrics=["accuracy"])
    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True, monitor="val_accuracy"),
    ]
    history = {"frozen": None, "finetune": None}
    if args.epochs_frozen:
        history["frozen"] = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=args.epochs_frozen,
            callbacks=callbacks,
            class_weight=class_weight,
        ).history
    base.trainable = True
    for layer in base.layers[:-20]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-4), loss=loss, metrics=["accuracy"])
    if args.epochs_finetune:
        history["finetune"] = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=args.epochs_finetune,
            callbacks=callbacks,
            class_weight=class_weight,
        ).history

    model_path = ARTIFACTS / "model.keras"
    model.save(model_path)
    with (ARTIFACTS / "train_history.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "backbone": manifest["backbone"],
                "train_images": train_count,
                "val_images": val_count,
                "class_weight": {str(index): weight for index, weight in class_weight.items()},
                "augmentation": [
                    "random_flip_left_right",
                    "random_scale_1.0_1.25_then_crop",
                    "random_rotation_15deg",
                    "random_brightness_0.12",
                    "random_contrast_0.85_1.15",
                ],
                "class_weight_cap": CLASS_WEIGHT_CAP,
                "history": history,
            },
            handle,
            indent=2,
        )
    print(f"saved {model_path}")


if __name__ == "__main__":
    main()
