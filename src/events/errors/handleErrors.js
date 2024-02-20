const process = require("node:process");
const { DiscordAPIError } = require('discord.js');
require("dotenv").config();
module.exports = (client) => {

    process.on('unhandledRejection', async (reason, promise) => {
        console.log("unhandled rejection at:", promise, 'reason:', reason);
        try {
        if (reason instanceof DiscordAPIError && reason.code === 50001) {
            console.log("Error occurred due to Missing Access.");
            
            // Extracting relevant information for the request
            const requestBody = reason.requestBody;
            const embeds = requestBody?.json?.embeds;
            const content = requestBody?.json?.content;
    
            console.log("Embeds:", embeds);
            console.log("Content:", content);
        }
    } catch (error) {
    return;            
    }
    });
    

process.on('uncaughtException', (err) => {
    console.log("Uncaught Exception:", err);
    try {

    client.users.send(process.env.OWNER_ID, `Error Occurred: \`\`\`${err}\`\`\``)
   } catch (error) {
        console.log("unable to send owner error.", error)
  }
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log("Uncaught Exception Monitor:", err, origin);
});

process.on('rejectionHandled', (err) => {
    console.log("rejected handled:", err);
})

process.on('warning', (warning) => {
    console.log("Warning:", warning);
})
}