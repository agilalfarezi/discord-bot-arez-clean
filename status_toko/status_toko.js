import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import path from "path";

const statusFile = path.resolve("./status_toko/status.json");

function loadStatus() {
  if (!fs.existsSync(statusFile)) {
    fs.writeFileSync(statusFile, JSON.stringify({ status: "OPEN" }, null, 2));
  }
  return JSON.parse(fs.readFileSync(statusFile, "utf8"));
}

function saveStatus(data) {
  fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
}

export const statusCommand = new SlashCommandBuilder()
  .setName("status_toko")
  .setDescription("Ubah status toko (admin only)")
  .addStringOption((opt) =>
    opt
      .setName("status")
      .setDescription("Status toko")
      .setRequired(true)
      .addChoices(
        { name: "OPEN", value: "OPEN" },
        { name: "CLOSE", value: "CLOSE" }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function handleStatusCommand(interaction) {
  const status = interaction.options.getString("status");

  const data = loadStatus();
  data.status = status;
  saveStatus(data);

  await interaction.reply({
    content: `✅ Status toko diubah menjadi **${status}**`,
    ephemeral: true,
  });
}
