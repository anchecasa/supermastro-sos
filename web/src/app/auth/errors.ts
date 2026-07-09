export function translateAuthError(message: string): string {
  const rateMatch = message.match(/after (\d+) seconds?/i);
  if (rateMatch) {
    return `Per sicurezza, attendi ${rateMatch[1]} secondi prima di richiedere una nuova email.`;
  }
  if (message.toLowerCase().includes("rate limit")) {
    return "Troppi tentativi. Attendi un minuto e riprova.";
  }
  if (message.toLowerCase().includes("invalid email")) {
    return "Indirizzo email non valido.";
  }
  return message;
}
