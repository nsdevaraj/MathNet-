#!/usr/bin/env python3

import argparse
import hashlib
import json
from pathlib import Path

from huggingface_hub import HfApi


def sha256_for(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as file_handle:
        for chunk in iter(lambda: file_handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish a verified OlympiadMath corpus to Hugging Face.")
    parser.add_argument("--repo-id", required=True, help="Dataset repository, for example user/olympiadmath-corpus.")
    parser.add_argument("--artifact-dir", default="artifacts/corpus")
    visibility = parser.add_mutually_exclusive_group(required=True)
    visibility.add_argument("--public", action="store_true")
    visibility.add_argument("--private", action="store_true")
    arguments = parser.parse_args()

    artifact_directory = Path(arguments.artifact_dir).resolve()
    manifest_path = artifact_directory / "manifest.json"
    if not manifest_path.is_file():
        raise RuntimeError(f"Corpus manifest not found: {manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    database_path = artifact_directory / manifest["database"]["file"]
    if not database_path.is_file():
        raise RuntimeError(f"Corpus database not found: {database_path}")
    if database_path.stat().st_size != manifest["database"]["bytes"]:
        raise RuntimeError("Corpus database size does not match the manifest.")
    if sha256_for(database_path) != manifest["database"]["sha256"]:
        raise RuntimeError("Corpus database SHA-256 does not match the manifest.")

    api = HfApi()
    account = api.whoami()["name"]
    if arguments.repo_id.split("/", 1)[0] != account:
        raise RuntimeError(
            f"Authenticated as {account}, but the requested repository belongs to {arguments.repo_id}.",
        )

    api.create_repo(
        repo_id=arguments.repo_id,
        repo_type="dataset",
        private=arguments.private,
        exist_ok=True,
    )
    api.upload_file(
        path_or_fileobj=database_path,
        path_in_repo=database_path.name,
        repo_id=arguments.repo_id,
        repo_type="dataset",
        commit_message=f"Publish corpus database {manifest['corpusVersion']}",
    )
    api.upload_file(
        path_or_fileobj=manifest_path,
        path_in_repo="manifest.json",
        repo_id=arguments.repo_id,
        repo_type="dataset",
        commit_message=f"Activate corpus {manifest['corpusVersion']}",
    )

    print(
        "Published corpus endpoint: "
        f"https://huggingface.co/datasets/{arguments.repo_id}/resolve/main/",
    )


if __name__ == "__main__":
    main()