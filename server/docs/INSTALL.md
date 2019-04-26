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
wget https://alkihis.fr/dl/busy_bird_server.zip -O busybird.zip 
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

By default, server use FILES to store entries and models.
You can use an MySQL server to store those data (files attached to entries will stay stored in inc/form_data/ folder).

```bash
sudo nano inc/cst.php
```

Edit here `SQL_*` constants to match to your SQL server settings
Set `ENTRIES_STORAGE` constant to `MODE_SQL`.

```php
const SQL_USER = "xxx";
const SQL_PASSWORD = "xxx";
const SQL_ADDRESS = "xxx";
const SQL_DATABASE = "busybird"; // Remains untouched
const ENTRIES_STORAGE = MODE_SQL;

// Optional: You can customise "admin password", the password used to create accounts !
const ADMIN_PASSWORD_AUTH = "xxxxxxxx";
```

Then, push base.sql file into your SQL server
```bash
mysql -u {username}

## Into MySQL prompt
SET autocommit=0; 
source src/base.sql; 
COMMIT;
SET autocommit=1; 
```

Busy Bird server is ready !
