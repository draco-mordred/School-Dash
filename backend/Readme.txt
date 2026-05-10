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