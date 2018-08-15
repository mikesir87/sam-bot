#!/bin/bash

chown git:git /var/opt/gitlab/backups/*
/opt/gitlab/embedded/bin/runsvdir-start &
sleep 10
gitlab-ctl reconfigure
gitlab-ctl stop unicorn
gitlab-ctl stop sidekiq
gitlab-rake gitlab:backup:restore force=yes

gitlab-ctl restart

# Tail all logs
gitlab-ctl tail &

# Wait for SIGTERM
wait

