module.exports = async (interaction, client, handler) => {
    if (interaction.isAutocomplete()) {
        const command = client.commands?.get(interaction.commandName);
        if (!command || typeof command.autocompleteRun !== 'function') return;
        try {
            await command.autocompleteRun(interaction, client);
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