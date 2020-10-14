#!/bin/bash
set -eu

BRANCH="master"
REPO_DIR="/var/www/formatlibrary.com/site"

REF=$(echo $@ | jq '.ref')
REPO=$(echo $@ | jq '.repository.name')
PUSHER=$(echo $@ | jq '.pusher.name')
REF="${REF%\"}"
REF="${REF#\"}"
REPO="${REPO%\"}"
REPO="${REPO#\"}"
PUSHER="${PUSHER%\"}"
PUSHER="${PUSHER#\"}"

if [[ "${REF}" ==  "refs/heads/${BRANCH}" ]];
then
	echo "Ref ${REF} received. Deploying ${BRANCH} branch to production..."
	cd ${REPO_DIR} && git pull origin master && gatsby build
	echo "Deployed Successfully!"

else
	echo "Ref ${REF} received. Doing nothing: only the ${BRANCH} branch may be deployed on this server."
	exit 1
fi

exit 0