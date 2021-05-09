
const hre = require("hardhat");

async function main() {
  const Password = await hre.ethers.getContractFactory("Password");
  const password = await Password.deploy();

  await password.deployed();

  console.log("Password deployed to:", password.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
