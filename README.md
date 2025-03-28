# @hexon-studio/atom-core 🚀

A powerful TypeScript-based SDK and CLI tool for interacting with Star Atlas blockchain operations.

## Overview 📋

@hexon-studio/atom-core provides both a command-line interface (CLI) and a software development kit (SDK) for interacting with various Star Atlas blockchain operations. Built with TypeScript, it offers a robust set of features for blockchain interactions, whether you're building applications or using the command line.

## Features ✨

- 🖥️ Command-line interface for blockchain operations
- 🛠️ TypeScript SDK for programmatic blockchain interactions
- 🔒 Full type safety and TypeScript support
- 🏗️ Modular architecture with separate error handling and utilities
- ⛓️ Integration with various Star Atlas blockchain components
- 📝 Built-in logging and error tracking

## Installation 📦

```bash
pnpm add @hexon-studio/atom-core
```

## Usage 🚀

### CLI Usage 💻
```bash
atom [command] [options]
```

### SDK Usage ⚙️
```typescript
import { createAtom } from "@hexon-studio/atom-core";
import { PublicKey } from "@solana/web3.js";

// Initialize SDK
const api = createAtom({
  rpcUrl: "https://api.mainnet-beta.solana.com",
  playerProfile: new PublicKey("your_profile_address"),
  owner: new PublicKey("your_wallet_address"),
  keypair: "your_keypair"
});

// Initialize the API
await api.init();

// Example: Dock a Fleet
const { status, data, error } = await api.fleet.dock("FleetName123");
if (status === "error") {
  console.error("Failed to dock:", error);
  return;
}
console.log("Fleet docked successfully:", data);

// Clean up when done
await api.dispose();
```

For more examples and detailed documentation, check out our [SDK Examples](https://your-docs-url.com/docs/examples/sdk).

## Development 🛠️

### Prerequisites ⚡

- Node.js (version specified in .nvmrc)
- pnpm (version specified in package.json)

### Setup 🔧

1. Clone the repository:
```bash
git clone https://github.com/yourusername/atom-core.git
cd atom-core
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
pnpm build
```

### Available Scripts 📜

- `pnpm build` - Build the project
- `pnpm dev` - Run the CLI in development mode
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run linting
- `pnpm release` - Create a new release

## Project Structure 📁

- `src/` - Source code
- `dist/` - Compiled output
- `docs/` - Documentation
- `atom-docs/` - Documentation website (submodule)

## Documentation 📚

For detailed documentation, visit the [documentation website](https://atom-docs.hexon.tools/) or check the `atom-docs` submodule.

## License 📄

ISC

## Contributing 🤝

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Support 💬

For support, please open an issue in the GitHub repository.


