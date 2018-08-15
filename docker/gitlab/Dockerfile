FROM gitlab/gitlab-ce@sha256:03bad28bc2d041d0a0fcb0ad9fb1a6466a9519cd981b1694cb954057b56fa7c0

COPY gitlab.rb /etc/gitlab/
COPY gitlab-secrets.json /etc/gitlab/
COPY 1534368049_2018_08_15_11.1.4_gitlab_backup.tar /var/opt/gitlab/backups/
COPY startup.sh /

CMD ["/startup.sh"] 
