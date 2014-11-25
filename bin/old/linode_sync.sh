rsync --verbose  --progress --stats --compress --rsh=/usr/bin/ssh --recursive --times --perms --links --delete \
--exclude "*bak" \
--exclude "*~" \
--exclude ".git" \
--exclude "node_modules" \
--exclude "build/editable" \
~/www/sites/examplesite/ michieljoris@linode:~/www/examplesite/









