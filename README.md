# Stack Verification Bot

This repo contains two sub-projects that are used in the verification of stack file changes in merge requests. The intent is this bot is configured as a webhook receiver for repos that contain stack files. The bot will validate changes, based on the rules below, and if valid, auto-merge the request.

## Component Overview

- **receiver** - this project provides an HTTP listener that will actually receive the webhook notification. Minimal validation is made (MR is open, target is master branch). From there, it will launch a container to perform the actual validation. If successful, it will auto-merge the request. If not, iti will post a comment to the merge request.
- **validator** - this project clones the source and target repo and performs actual validation of the stack files. If invalid, it exits with a non-zero exit code and the error/invalidation is printed to `stderr`. 

