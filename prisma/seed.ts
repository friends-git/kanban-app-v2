async function run() {
  const target = process.argv[2]?.trim().toLowerCase();

  if (!target || !["dev", "prod"].includes(target)) {
    console.error("Informe o alvo da seed: dev ou prod.");
    console.error("Exemplos:");
    console.error("  npm run db:seed:dev");
    console.error("  npm run db:seed:prod");
    process.exit(1);
  }

  const modulePath = target === "dev" ? "./seed.dev.ts" : "./seed.prod.ts";
  const seedModule = await import(modulePath);

  if (typeof seedModule.main !== "function") {
    throw new Error(`A seed ${target} não exporta uma função main().`);
  }

  await seedModule.main();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
