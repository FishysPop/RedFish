module.exports = async (interaction, client, handler) => {
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        try {
            await command.autocompleteRun(interaction);
        } catch (error) {
            console.log(`Error while autocompleting: ${error}`)
        }
    } else {
        return;
    }
}