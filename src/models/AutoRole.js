const { Schema, model } = require('mongoose');

const autoRoleSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  roleId: {
    type: String,
  }
});

module.exports = model('AutoRole', autoRoleSchema);