# Stack Auto-Merger (SAM)

> Wouldn't it be nice to auto-merge merge requests for simple changes to Docker stack files?  We thought so too! Say hello to Sam!

![SAMBot Logo](./SAMbot.png)

SAM's intent is to be configured as a webhook receiver for repos that contain stack files. SAM will validate the changes, and if valid, auto-merge the request.

## Quick FAQ

### Why SAM?

For general-use Swarm clusters, we'd like to give as much control as possible back to the individual teams, rather than require a central ops team to deploy everything. But, we want to ensure services don't step on each other's toes.

By giving each app its own repo, we can utilize "services as code". The repo simply contains a single Stack file (docker-stack.yml) and the master branch represents current state in the cluster for that stack. As changes to the master branch are made, a configured runner deploys the stack file.

With SAM, dev teams can make merge/pull requests to the master branch to request changes.  To prevent the need to manually review each change (especially for just an image change), SAM was developed to auto-accept merge requests. If the requested changes are valid, SAM can auto-merge the request, allowing changes to be immediately deployed.

### Why not Docker EE RBAC?

Funny you ask because we are using Docker EE!  While its RBAC capabilities are strong, it doesn't yet have granular enough permissions to limit a user from making changes to labels (or certain labels).  Because of this, a user could change labels (like `traefik.frontend.rule`) and take over another service's domain. Since we want to give as much control back to the teams, we built SAM.

Once the services are deployed, we give the teams (mostly) read-only access to their services in UCP, allowing them to view logs, access the console, etc. 

### How's SAM work?

In a quick nutshell, a webhook request comes in indicating a merge request was opened/changed. SAM performs a quick validation (is it still open) and then spins up a container running a validator.  The validator clones the source and target repos and performs a diff of the YAML files. If valid, the MR is auto-merged. Otherwise, a comment is simply added indicating why SAM can't auto-merge. 

### What changes are auto-mergeable?

Great question!  Currently, the following are allowed.  We're looking to make this more configurable so you can apply your own rules.

- **Image changes** - any changes to any service are valid
- **_Most_ label changes** - the addition/removal/change of any labels are valid, except for those starting with `traefik`. This ensures one group doesn't accidentally take control of the traffic of another service.

If you want to look deeper, look at the `validateDifferences.js` file, where a few regex patterns are provided to whitelist various changes (it operates on a flattened diff of the files).

### What happens if a change is "invalid"?

SAM simply makes a comment on the merge request indicating he is unable to auto-merge. Then, it's up to a human to intervene. This still allows changes to things like CPU resources, volume mappings, etc.  SAM will _never_ auto-close a MR.

### What Git repos are supported?

Currently, only GitLab is supported.  But, it wouldn't take much to support GitHub or other repos (as we designed it to be easily extendable). Take a look at the `gitlabProcessor.js` file to see the functions needed to process webhook requests from other vendors.


## Component Overview

This application is composed of two components, the **receiver** and **validator**. You need only start the **receiver**, as the validator will be launched as needed.

### Receiver

The receiver acts as the HTTP listener for webhook notifications. It uses a collection of processors to support various vendors (only GitLab support included right now). The processor provides the interface to validate the initial request, extract details, post comments, and merge the request.

When the processor has performed initial validation, it spins up a container to perform the YAML diff validation.


### Validator

The validator clones the source and target repos, extracts the YAML files, and performs a diff. If valid, it exits with a status of 0. Any non-zero exit code indicates validation failure and the error message is printed via `stderr`.

The reason the validator runs in a container is to minimize any directory collision that might occur with repo cloning. Every validation starts with a clean slate. Also, clean-up is super easy!


## Component Configuration

Since the _receiver_ component launches the _validator_, there are various configuration options that are needed in order to configure the container correctly.

### SSH Key Setup

In order to perform validation, the validator clones both the source and target repos. Currently, the only supported mechanism is using a SSH key (preferably a deploy/read-only key on the repo).

To prevent mishandling of the SSH key, the key must be delivered via volume (can't use Swarm secrets as the container is launched directly and not via Swarm). When the container launches, it will mount the specified volume and make it available to the container. The binding is specified as a normal Docker mount: `${SSH_KEY_VOLUME_SOURCE}:${SSH_KEY_VOLUME_DESTINATION}`. Therefore, the value of the source can be either a direct bind mount or a named volume.

The value of `SSH_KEY_FILE_PATH` is to provide the full path the validator should use to access the SSH key.

### Receiver

The receiver **requires** the following environment variables to be set when starting up:

| Variable name                  | Description                                                                                              |
|--------------------------------|----------------------------------------------------------------------------------------------------------|
| GITLAB_BASE_URL                | API URL for GitLab (example: https://my.gitlab.com/api/v3                                                |
| GITLAB_SECRET_TOKEN_KEY        | Name of the secret file (in `/run/secrets`) that contains the GitLab secret key                          | 
| SSH_KEY_VOLUME_SOURCE          | When starting the validator, the source "side" of the volume mount of the SSH key                        |
| SSH_KEY_VOLUME_DESTINATION     | When starting the validator, the destination "side" of the volume mount of the SSH key                   |
| SSH_KEY_FILE_PATH              | Full filepath of the SSH key, to be used in the validator to clone repos                                 |
| VERIFY_IMAGE_NAME _(optional)_ | Image name to be used for the validator (to allow use of your own). Default: mikesir87/sam-bot-validator |

- The receiver also **requires** the Docker socket to be mounted, as it needs to be able to launch containers to perform validation.
- Finally, a Swarm secret that contains a GitLab access token. This access token MUST have write access to the stack repos, as it will (hopefully) auto-merge requests. The name of the secret is provided to the app using the env variable `$GITLAB_SECRET_TOKEN_KEY` 


### Validator

The validator **requires** the following environment variables to be set when starting up. Each of these are set when the receiver starts the container.

| Variable name        | Description                                          |
|----------------------|------------------------------------------------------|
| **TARGET_GIT_URL**   | the target repo clone URL (should be ssh)            |
| **TARGET_BRANCH**    | the target branch                                    |
| **SOURCE_GIT_URL**   | the source repo clone URL (should be ssh)            |
| **SOURCE_BRANCH**    | the source branch                                    |
| **SOURCE_COMMIT_ID** | commit hash that should be used on the source branch |
| **SSH_KEY_FILE**     | file path of an SSH key to be used for repo cloning  |

- The SSH key here obviously needs to have access to the repos. It probably should only have read access to the repos (deploy key).
 