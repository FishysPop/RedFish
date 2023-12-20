module.exports = async (interaction, client, handler) => {
    if (interaction.isAutocomplete()) {
        if (client.playerType === 'lavalink') {
            return;
        }
        const command = client.commands.get(interaction.commandName);
        try {
            await command.autocompleteRun(interaction);
        } catch (error) {
            if (error.code === 10062) {
                return;
            }
            console.log(`Error while autocompleting: ${error}`);   
            return;  
           }
    } else {
        return;
    }
}