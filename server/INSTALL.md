# Busy Bird server deployment

You should use an Apache Server to make this program work.
PHP *(version >= 7.1)* should be installed in your server and `mod_php` enabled (by default, it's enabled with a `apt` PHP install)


Server must be at a root of a domain/subdomain, otherwise you must make some adjustments in `endpoints/manager.php`, `__construct` function.

For more conveniance, create a specific Apache Virtual Host for the server ! An example is given in `src/busybird.conf`.

You must have Apache's `mod_rewrite` enabled.

Here's a configuration sample:

```bash
## During this tutorial, you have to replace
# {your_server_domain} by your domain name, fe. www.exemple.com,
# and {your_username} by your UNIX username

# TODO check if this works
# Download server and unzip it
wget DOWNLOAD_URL/busy_bird_server.zip -O busybird.zip 
unzip busybird.zip -d busy_bird_server

sudo mv busy_bird_server /var/www
cd /var/www
# Own the directory to you and apache group (www-data) 
sudo chown -R {your_username}:www-data busy_bird_server
# Allow apache group to write into the folder (required)
sudo chmod -R g+w busy_bird_server

# Use your favorite editor to modify the conf file
# Change the "ServerName" and the "ServerAlias" lines
# with your server URL (domain name)
nano busy_bird_server/src/busybird.conf

# Debian / Ubuntu
sudo cp busy_bird_server/src/busybird.conf /etc/apache2/sites-available

# Others
sudo cp busy_bird_server/src/busybird.conf /etc/httpd/sites-available

# Enable URL rewriting
sudo a2enmod rewrite
# Required to set "Access-Control-Allow-Origin" and "Access-Control-Allow-Headers" headers
sudo a2enmod headers

# Enable site and apply configuration
sudo a2ensite busybird
sudo apachectl -k restart


### Badly suggested:
### Get a HTTPS certificate for your server with Let's Encrypt
### "Let’s Encrypt is a free, automated, and open certificate authority, run for the public’s benefit."
## https://letsencrypt.org/getting-started/
# For Debian 9, example:
sudo apt-get install certbot python-certbot-apache -t stretch-backports

sudo certbot --apache -d {your_server_domain}

# Congrats ! https://{your_server_domain} is now a valid Busy Bird server !
```

