MONGO_URL='mongodb+srv://username:password@cluster0.ieavsrc.mongodb.net/schooldash?appName=Cluster0' 

# "mongodb://username:password@cluster0-shard-00-00.ieavsrc.mongodb.net:27017,cluster0-shard-00-01.ieavsrc.mongodb.net:27017,cluster0-shard-00-02.ieavsrc.mongodb.net:27017/schooldash?" 
# use the above if the below doesn't work, the below is the connection string provided by MongoDB Atlas, but it doesn't work for some reason, while the above does. I don't know why, but it is what it is. 
# Error includes:Server is running on http://localhost:3000
# Error: querySrv ECONNREFUSED _mongodb._tcp.cluster0.ieavsrc.mongodb.net
# error: script "start" exited with code 1
# the above error is related to the fact that the connection string provided by MongoDB Atlas uses the DNS seedlist connection format, which requires the use of the DNS SRV record to resolve the hostname. This can sometimes cause issues with certain network configurations or DNS resolvers. The connection string that works uses the standard connection format, which does not rely on DNS SRV records and instead specifies the individual hostnames and ports for each shard in the cluster.
# 'mongodb+srv://username:password@cluster0.ieavsrc.mongodb.net/schooldash?appName=Cluster0'
# 'mongodb+srv://username:password@cluster0.ieavsrc.mongodb.net/?appName=Cluster0&authSource=admin&replicaSet=atlas-1l7h8i-shard-0&w=majority'

To fix the MongoDB connection error, you can enter this line of code in the Index.ts file:

//Add this line to set custom DNS servers for the application, which can help resolve connectivity issues with MongoDB Atlas
    const dns = require("dns");
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
// The above line sets the DNS servers to Google's public DNS servers (https://developers.google.com/speed/public-dns), as well as Cloudflare's DNS server (https://developers.cloudflare.com/)


1. Download Local ComponentsYou will need to download the following from the MongoDB Download Center:MongoDB Community Server: The core database engine that runs locally on your machine.MongoDB Compass: The official graphical user interface (GUI) for managing your data without needing a command line.MongoDB Shell (mongosh): A command-line tool for advanced database operations.
2. Install on WindowsRun the Installer: Double-click the .msi file and follow the setup wizard.Service Configuration: Choose "Complete" and ensure the "Install MongoDB as a Service" box is checked. This allows the database to start automatically when your computer turns on.Install Compass: During installation, check the box to include MongoDB Compass.
3. Install on Linux (Offline/Air-gapped)If the machine has no internet access at all, you must transfer the files manually:Get the Tarball: Download the .tgz tarball on a machine with internet.Transfer & Extract: Move the file to the offline system and extract it.Manual Setup: Use sudo systemctl start mongod to start the service once the binaries are in place.
4. Connect to LocalhostOnce installed, your local database is reachable at a "localhost" address rather than a cloud URL:Default Connection String: mongodb://localhost:27017.Via Compass: Open MongoDB Compass and click "Connect" using the default local string.Via Terminal: Type mongosh to open an interactive shell session.
5. Syncing Data (Optional)If you need to move data from a remote Atlas database to your offline setup:Export/Import: Use mongoexport from your cloud cluster and mongoimport on your local machine.Offline-First Sync: For apps that need to sync when they eventually get online, consider tools like PowerSync or ObjectBox which integrate with MongoDB to handle background synchronization.