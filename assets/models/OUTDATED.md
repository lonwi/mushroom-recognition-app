# Przestarzałe

`labels.json` i `attributions.jsonl` to kontrakt klas prototypu (54 wyjścia, w tym `unknown_mushroom` i `not_a_mushroom`). Zostają wyłącznie dlatego, że zamrożone testy w `ml/tests/test_contract.py` je ładują.

Manifest aplikacji greenfield jest w `schemas/model-manifest.schema.json`. Gatunki bez danych opisuje pole `uncoveredSpecies`, a nie klasa zbiorcza.
