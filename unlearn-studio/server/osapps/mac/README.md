# osapps/mac — macOS builds (.dmg)

This folder holds macOS `.dmg` installers served by the server at:

    /osapps/mac/<filename>

The folder is intentionally empty in git (build artifacts are never committed —
see the `.gitignore` rules next to this file). It is filled automatically:

    ./apps/desktop/scripts/build-apps.sh --stage-only        # build + copy here
    ./server/scripts/deploy-all.sh                           # build + copy + upload to AWS
    ./server/scripts/upload-build.sh "path/to/App.dmg"       # copy one file

Old builds are deleted automatically on every staging run so only the latest
artifacts remain. Files are picked up by `GET /api/downloads`.
