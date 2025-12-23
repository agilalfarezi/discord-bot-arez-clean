import { EmbedBuilder } from "discord.js";

export function createPaymentEmbed(total) {
  return new EmbedBuilder()
    .setTitle("💳 PEMBAYARAN QRIS")
    .setDescription(
      `**Total yang harus dibayarkan:**\n` +
        `💸**Rp ${total.toLocaleString("id-ID")}**\n\n` +
        `Silakan scan QRIS di bawah ini untuk melakukan pembayaran.\n` +
        `Setelah transfer, kirim bukti pembayaran di sini.`
    )
    .setImage("attachment://qrisarezstore.jpg")
    .setFooter({ text: "Arez Store • QRIS Payment" })
    .setColor("#00FF88");
}
