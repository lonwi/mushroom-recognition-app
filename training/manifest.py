"""Load the committed class contract. The app and the trainer share one file."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS_PATH = ROOT / "assets" / "models" / "labels.json"

# Poland and the neighbours the regional fetch walks before the global fill.
CENTRAL_EUROPE = ("PL", "DE", "CZ", "SK", "AT", "HU", "LT", "LV", "EE")

BACKGROUND_CLASS_ID = "not_a_mushroom"
UNKNOWN_CLASS_ID = "unknown_mushroom"
AGGREGATE_CLASS_IDS = (UNKNOWN_CLASS_ID, BACKGROUND_CLASS_ID)


def load_manifest(path: Path | None = None) -> dict:
    manifest_path = path or LABELS_PATH
    with manifest_path.open(encoding="utf-8") as handle:
        manifest = json.load(handle)
    classes = manifest["classes"]
    ids = [item["id"] for item in classes]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate class id in labels.json")
    for index, item in enumerate(classes):
        if item["index"] != index:
            raise ValueError(f"class {item['id']} index {item['index']} != position {index}")
        if "status" in item or "edibility" in item:
            raise ValueError(f"class {item['id']} must not carry an edibility verdict")
    if len(classes) < 2 or classes[-1]["id"] != BACKGROUND_CLASS_ID:
        raise ValueError("the background class must be last so logit indexes stay stable")
    if classes[-2]["id"] != UNKNOWN_CLASS_ID:
        raise ValueError("unknown_mushroom must sit immediately before not_a_mushroom")
    _validate_sampling(classes)
    validate_toxic_probes(manifest)
    if manifest.get("model_packaged"):
        model_file = ROOT / "assets" / "models" / manifest["model_file"]
        if not model_file.is_file():
            raise ValueError("manifest says the model is packaged but the tflite file is missing")
    return manifest


def _gbif_key(value: object, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{label} needs a positive GBIF usage key, not {value!r}")
    return value


def _claim_key(owner_of: dict[int, str], key: int, owner: str) -> None:
    previous = owner_of.get(key)
    if previous is not None and previous != owner:
        raise ValueError(f"GBIF key {key} is used by both {previous} and {owner}")
    owner_of[key] = owner


def _validate_sampling(classes: list[dict]) -> None:
    """Collisions are GBIF accepted keys. The same key may repeat only as synonyms of one class."""
    owner_of: dict[int, str] = {}
    known_genera: set[str] = set()
    for item in classes:
        if item["id"] in AGGREGATE_CLASS_IDS:
            continue
        if item.get("sampling"):
            raise ValueError(f"{item['id']} is a species class and must not set aggregate sampling")
        tag = item.get("safety_tag")
        if tag not in ("toxic", "edible", "other"):
            raise ValueError(f"{item['id']} needs safety_tag toxic, edible, or other")
        names = [str(name) for name in item.get("gbif_names") or []]
        keys = item.get("gbif_keys")
        if not isinstance(keys, list) or len(keys) != len(names) or not names:
            raise ValueError(f"{item['id']} needs one gbif_keys entry per gbif name")
        if len(set(names)) != len(names):
            raise ValueError(f"{item['id']} repeats a GBIF name")
        genus = str(item.get("genus") or "")
        if genus:
            known_genera.add(genus)
        for name, raw_key in zip(names, keys):
            _claim_key(owner_of, _gbif_key(raw_key, f"{item['id']} {name}"), item["id"])
    for item in classes:
        if item["id"] not in AGGREGATE_CLASS_IDS:
            continue
        if item.get("safety_tag"):
            raise ValueError(f"{item['id']} is not a species and must not carry safety_tag")
        _validate_aggregate(item, owner_of, known_genera)


def _validate_aggregate(item: dict, owner_of: dict[int, str], known_genera: set[str]) -> None:
    sampling = item.get("sampling") or {}
    taxa = sampling.get("taxa")
    if not isinstance(taxa, list) or not taxa:
        raise ValueError(f"{item['id']} needs sampling.taxa")
    names = [str(name) for name in item.get("gbif_names") or []]
    held = [str(name) for name in sampling.get("held_out_gbif_names") or []]
    per_taxon = sampling.get("per_taxon_cap")
    class_cap = sampling.get("class_cap")
    if not isinstance(per_taxon, int) or not isinstance(class_cap, int):
        raise ValueError(f"{item['id']} needs integer per_taxon_cap and class_cap")
    if per_taxon < 1 or class_cap < 1:
        raise ValueError(f"{item['id']} sampling caps must be positive")
    if not 1500 <= class_cap <= 3000:
        raise ValueError(f"{item['id']} class_cap must sit between 1500 and 3000 images")
    if len(names) < 30:
        raise ValueError(f"{item['id']} needs many taxa, not a handful of GBIF names")
    if len(held) < 8:
        raise ValueError(f"{item['id']} must hold taxa out for the test split")
    if len(set(names)) != len(names) or len(set(held)) != len(held):
        raise ValueError(f"{item['id']} repeats a GBIF name")
    taxon_names = []
    held_from_taxa = []
    for taxon in taxa:
        name = str(taxon.get("name") or "")
        if not name:
            raise ValueError(f"{item['id']} has a taxon without a name")
        taxon_names.append(name)
        if taxon.get("held_out"):
            held_from_taxa.append(name)
        relation = taxon.get("relation")
        if item["id"] == UNKNOWN_CLASS_ID:
            genus = name.split()[0]
            expected = "unknown_species_of_known_genus" if genus in known_genera else "unknown_genus"
            if relation != expected:
                raise ValueError(f"{name} relation {relation} does not match genus {genus}")
        elif relation:
            raise ValueError(f"{item['id']} taxon {name} must not set a genus relation")
        if not isinstance(taxon.get("toxic"), bool):
            raise ValueError(f"{name} needs toxic true or false")
        _claim_key(owner_of, _gbif_key(taxon.get("gbif_key"), name), f"{item['id']}:{name}")
    if taxon_names != names:
        raise ValueError(f"{item['id']} gbif_names and sampling.taxa are out of order")
    if held_from_taxa != held:
        raise ValueError(f"{item['id']} held_out_gbif_names does not match taxa marked held_out")
    missing = [name for name in held if name not in names]
    if missing:
        raise ValueError(f"{item['id']} held-out names are not in gbif_names: {missing}")
    if per_taxon * len(names) < 1500:
        raise ValueError(f"{item['id']} cannot reach 1500 images at the per-taxon cap")


_VISUAL_GROUP_MINIMUMS = {
    "lepiota_amatoxin": 150,
    "conocybe_pholiotina": 100,
    "omphalotus": 50,
    "tricholoma_equestre": 50,
}
_REQUIRED_EXCEPTIONS = ("Lepiota brunneoincarnata", "Inosperma erubescens", "Conocybe filaris")


def validate_toxic_probes(manifest: dict) -> None:
    probes = manifest.get("toxic_probes")
    if not isinstance(probes, dict):
        raise ValueError("labels.json needs a toxic_probes block")
    if probes.get("class_id") != UNKNOWN_CLASS_ID:
        raise ValueError("toxic probes are labeled unknown_mushroom and must not be their own class")
    cap = probes.get("per_taxon_cap")
    if not isinstance(cap, int) or cap < 70 or cap > 80:
        raise ValueError("toxic probes fetch 70 to 80 photos per taxon so dedup can still meet the floor")
    if probes.get("minimum_poisonous_held_out_images") != 300:
        raise ValueError("poisonous held-out minimum stays 300")
    if probes.get("other_taxon_minimum") != 50:
        raise ValueError("taxa outside a rare-taxon exception need 50 images")
    if probes.get("rare_exception_minimum") != 5:
        raise ValueError("a rare-taxon exception needs at least 5 images")
    if "minimum_images_per_taxon" in probes:
        raise ValueError("the flat per-taxon probe floor was replaced by visual groups and rare_taxon_exceptions")
    taxa = probes.get("taxa")
    if not isinstance(taxa, list) or len(taxa) < 8:
        raise ValueError("toxic probes need the listed look-alike taxa")
    classes = manifest["classes"]
    owner_of: dict[int, str] = {}
    for item in classes:
        if item["id"] in AGGREGATE_CLASS_IDS:
            for taxon in (item.get("sampling") or {}).get("taxa") or []:
                owner_of[int(taxon["gbif_key"])] = f"{item['id']}:{taxon['name']}"
            continue
        for key in item.get("gbif_keys") or []:
            owner_of[int(key)] = item["id"]
    known_genera = {str(item.get("genus") or "") for item in classes if item["id"] not in AGGREGATE_CLASS_IDS}
    seen_names: set[str] = set()
    for taxon in taxa:
        name = str(taxon.get("name") or "")
        if name in seen_names:
            raise ValueError(f"toxic probe {name} is repeated")
        seen_names.add(name)
        if taxon.get("toxic") is not True or taxon.get("held_out") is not True:
            raise ValueError(f"toxic probe {name} must be toxic and held out of train and val")
        genus = name.split()[0] if name else ""
        expected = "unknown_species_of_known_genus" if genus in known_genera else "unknown_genus"
        if taxon.get("relation") != expected:
            raise ValueError(f"toxic probe {name} relation does not match genus {genus}")
        _claim_key(owner_of, _gbif_key(taxon.get("gbif_key"), name), f"probe:{name}")
    _validate_visual_groups(manifest, probes, {str(taxon["name"]): taxon for taxon in taxa})


def _validate_visual_groups(manifest: dict, probes: dict, probe_by_name: dict[str, dict]) -> None:
    groups = probes.get("visual_groups")
    if not isinstance(groups, list):
        raise ValueError("toxic probes need visual_groups")
    seen_ids: dict[str, dict] = {}
    group_of: dict[str, str] = {}
    for group in groups:
        group_id = str(group.get("id") or "")
        if group_id in seen_ids or group_id not in _VISUAL_GROUP_MINIMUMS:
            raise ValueError(f"unexpected visual group {group_id}")
        if group.get("minimum_images") != _VISUAL_GROUP_MINIMUMS[group_id]:
            raise ValueError(f"{group_id} minimum must be {_VISUAL_GROUP_MINIMUMS[group_id]}")
        names = group.get("taxa")
        if not isinstance(names, list) or not names:
            raise ValueError(f"{group_id} needs taxa")
        for name in names:
            if name not in probe_by_name:
                raise ValueError(f"{group_id} taxon {name} is not a toxic probe")
            if name in group_of:
                raise ValueError(f"{name} is in more than one visual group")
            group_of[str(name)] = group_id
        seen_ids[group_id] = group
    if set(seen_ids) != set(_VISUAL_GROUP_MINIMUMS):
        raise ValueError("visual groups do not match the Lepiota, Conocybe, Omphalotus, and Tricholoma quotas")
    exceptions = probes.get("rare_taxon_exceptions")
    if not isinstance(exceptions, list):
        raise ValueError("toxic probes need rare_taxon_exceptions")
    known = _taxon_index(manifest)
    seen_exceptions: set[str] = set()
    for item in exceptions:
        name = str(item.get("taxon") or "")
        if not name or name in seen_exceptions:
            raise ValueError(f"rare exception {name} is missing or repeated")
        seen_exceptions.add(name)
        if name not in known:
            raise ValueError(f"rare exception {name} is not a poisonous held-out taxon")
        key = _gbif_key(item.get("gbif_key"), name)
        if key != int(known[name]["gbif_key"]):
            raise ValueError(f"rare exception {name} GBIF key does not match the manifest")
        reason = item.get("reason")
        if not isinstance(reason, str) or len(reason.strip()) < 20:
            raise ValueError(f"rare exception {name} needs a reason")
        count = item.get("gbif_licensed_count")
        if isinstance(count, bool) or not isinstance(count, int) or count < 0:
            raise ValueError(f"rare exception {name} needs a GBIF licensed count")
        checked = str(item.get("date_checked") or "")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", checked):
            raise ValueError(f"rare exception {name} needs a date_checked of YYYY-MM-DD")
        group_id = item.get("group_id")
        if name in group_of:
            if group_id != group_of[name]:
                raise ValueError(f"rare exception {name} must name visual group {group_of[name]}")
        elif group_id:
            raise ValueError(f"rare exception {name} is not in visual group {group_id}")
    missing = [name for name in _REQUIRED_EXCEPTIONS if name not in seen_exceptions]
    if missing:
        raise ValueError(f"rare_taxon_exceptions is missing {', '.join(missing)}")


def _taxon_index(manifest: dict) -> dict[str, dict]:
    """Poisonous held-out taxa by scientific name, probes included."""
    found: dict[str, dict] = {}
    for item in manifest["classes"]:
        if item["id"] != UNKNOWN_CLASS_ID:
            continue
        for taxon in (item.get("sampling") or {}).get("taxa") or []:
            if taxon.get("toxic") and taxon.get("held_out"):
                found[str(taxon["name"])] = taxon
    for taxon in (manifest.get("toxic_probes") or {}).get("taxa") or []:
        if taxon.get("toxic") and taxon.get("held_out"):
            found[str(taxon["name"])] = taxon
    return found


def poisonous_heldout_taxa(manifest: dict | None = None) -> list[str]:
    """Poisonous taxa that never enter train or val, including toxic probes.

    A taxon with no downloaded photos is still listed. The ship gate needs
    that zero so a short GBIF name cannot vanish from the sample check.
    """
    manifest = manifest or load_manifest()
    names: list[str] = []
    for item in manifest["classes"]:
        if item["id"] != UNKNOWN_CLASS_ID:
            continue
        for taxon in (item.get("sampling") or {}).get("taxa") or []:
            if taxon.get("toxic") and taxon.get("held_out"):
                names.append(str(taxon["name"]))
    for taxon in (manifest.get("toxic_probes") or {}).get("taxa") or []:
        if taxon.get("toxic") and taxon.get("held_out"):
            names.append(str(taxon["name"]))
    return names


def safety_catalog(manifest: dict | None = None) -> dict:
    """Edible class ids and poisonous taxa. This is an evaluation label, not a verdict to show."""
    manifest = manifest or load_manifest()
    edible: set[str] = set()
    toxic_classes: set[str] = set()
    taxa: dict[str, dict] = {}
    for item in manifest["classes"]:
        if item["id"] in AGGREGATE_CLASS_IDS:
            for taxon in (item.get("sampling") or {}).get("taxa") or []:
                taxa[str(taxon["name"])] = taxon
            continue
        if item.get("safety_tag") == "edible":
            edible.add(item["id"])
        elif item.get("safety_tag") == "toxic":
            toxic_classes.add(item["id"])
    for taxon in (manifest.get("toxic_probes") or {}).get("taxa") or []:
        taxa[str(taxon["name"])] = taxon
    return {"edible_ids": edible, "toxic_class_ids": toxic_classes, "taxa": taxa}


def species_classes(manifest: dict | None = None) -> list[dict]:
    """Known species. Excludes the unknown-fungus class and the background class."""
    manifest = manifest or load_manifest()
    return [item for item in manifest["classes"] if item["id"] not in AGGREGATE_CLASS_IDS]


def fungi_classes(manifest: dict | None = None) -> list[dict]:
    return species_classes(manifest)
