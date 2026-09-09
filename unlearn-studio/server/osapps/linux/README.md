# osapps/linux — Linux builds (.AppImage / .deb / .rpm)

This folder holds Linux `.AppImage` / `.deb` / `.rpm` packages served by the
server at:

    /osapps/linux/<filename>

The folder is intentionally empty in git (build artifacts are never committed —
see the `.gitignore` rules next to this file). It is filled automatically:

    ./apps/desktop/scripts/build-apps.sh --stage-only        # build + copy here
    ./server/scripts/deploy-all.sh                           # build + copy + upload to AWS
    ./server/scripts/upload-build.sh "path/to/App.AppImage"  # copy one file

Old builds are deleted automatically on every staging run so only the latest
artifacts remain. Files are picked up by `GET /api/downloads`.
