"""Transfer-learn MobileNetV3-Small and write logits (no softmax).

Backbone weights: keras.applications.MobileNetV3Small(weights='imagenet'),
Apache-2.0. Run this on a GPU machine. See training/README.md.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from manifest import ROOT, load_manifest
from preprocess import preprocess_rgb_uint8

DATA_DIR = ROOT / "training" / "data"
ARTIFACTS = ROOT / "training" / "artifacts"


def _load_splits() -> dict:
    path = DATA_DIR / "splits.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _dataset(split_name: str, class_index: dict[str, int], image_size: int):
    import tensorflow as tf

    splits = _load_splits()
    samples = [row for row in splits[split_name] if row.get("downloaded", True)]
    paths = [str(DATA_DIR / row["file"]) for row in samples]
    labels = [class_index[row["class_id"]] for row in samples]

    def load(path, label):
        image = tf.io.read_file(path)
        decoded = tf.io.decode_image(image, channels=3, expand_animations=False)
        decoded.set_shape([None, None, 3])
        numpy_image = tf.numpy_function(lambda value: preprocess_rgb_uint8(value, image_size), [decoded], tf.float32)
        numpy_image.set_shape([image_size, image_size, 3])
        return numpy_image, label

    dataset = tf.data.Dataset.from_tensor_slices((paths, labels))
    dataset = dataset.map(load, num_parallel_calls=tf.data.AUTOTUNE)
    return dataset, len(samples)


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

    train_ds, train_count = _dataset("train", class_index, args.image_size)
    val_ds, val_count = _dataset("val", class_index, args.image_size)
    if train_count == 0 or val_count == 0:
        raise SystemExit("train or val split is empty. Run fetch, dedup, and split first.")

    train_ds = train_ds.shuffle(min(1000, train_count), seed=42).batch(args.batch_size).prefetch(tf.data.AUTOTUNE)
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
            train_ds, validation_data=val_ds, epochs=args.epochs_frozen, callbacks=callbacks
        ).history
    base.trainable = True
    for layer in base.layers[:-20]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-4), loss=loss, metrics=["accuracy"])
    if args.epochs_finetune:
        history["finetune"] = model.fit(
            train_ds, validation_data=val_ds, epochs=args.epochs_finetune, callbacks=callbacks
        ).history

    model_path = ARTIFACTS / "model.keras"
    model.save(model_path)
    with (ARTIFACTS / "train_history.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "backbone": manifest["backbone"],
                "train_images": train_count,
                "val_images": val_count,
                "history": history,
            },
            handle,
            indent=2,
        )
    print(f"saved {model_path}")


if __name__ == "__main__":
    main()
