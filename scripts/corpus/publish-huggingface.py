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
    parser.add_argument("--web-corpus-dir", default="public")
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

    web_corpus_directory = Path(arguments.web_corpus_dir).resolve()
    web_index_path = web_corpus_directory / "mathnet_index.json"
    if not web_index_path.is_file():
        raise RuntimeError(f"Web corpus index not found: {web_index_path}")

    web_index = json.loads(web_index_path.read_text(encoding="utf-8"))
    web_chunks = web_index.get("chunks")
    if not isinstance(web_chunks, list) or not web_chunks:
        raise RuntimeError("Web corpus index does not contain any chunks.")
    missing_chunks = [
        chunk
        for chunk in web_chunks
        if not isinstance(chunk, str) or not (web_corpus_directory / chunk).is_file()
    ]
    if missing_chunks:
        raise RuntimeError(f"Web corpus chunks are missing: {', '.join(map(str, missing_chunks))}")

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
    api.upload_folder(
        folder_path=web_corpus_directory,
        path_in_repo="",
        repo_id=arguments.repo_id,
        repo_type="dataset",
        allow_patterns=["mathnet*.json"],
        commit_message=f"Publish web corpus {manifest['corpusVersion']}",
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