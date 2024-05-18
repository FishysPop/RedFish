const { Client, GuildMember, PermissionsBitField } = require('discord.js');
const AutoRole = require('../../models/AutoRole');

module.exports = async (member, client, handler) => {

    let guild = member.guild;
    if (!guild) return;

    const autoRole = await AutoRole.findOne({ guildId: guild.id });
    if (!autoRole) return;

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      await AutoRole.deleteOne({ guildId: guild.id });

      const owner = guild.ownerId;
      console.log(`Autorole disabled in ${guild.name} due to missing permissions`)
      try {
      if (owner) {
        client.users.send(owner, `AutoRole has been disabled for your guild "${guild.name}" because the bot does not have the required permissions to manage roles.`);
      }
      return;
    } catch (error) {
     return;   
    }
    }

    const role = guild.roles.cache.get(autoRole.roleId);
    if (!role || role.position >= guild.members.me.roles.highest.position) {

      await AutoRole.deleteOne({ guildId: guild.id });
      console.log(`Autorole disabled in ${guild.name} due to role being higher`)

      const owner = guild.ownerId;
      
      try {
      if (owner) {
        client.users.send(owner,`AutoRole has been disabled for your guild "${guild.name}" because the role "${role.name}" is higher than the bot's highest role.`);
      }
      return;
    } catch (error) {
      return;
    }
    }

    await member.roles.add(autoRole.roleId);

};
