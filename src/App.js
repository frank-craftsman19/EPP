import React, { useState } from 'react';
import { ethers } from 'ethers';
import EthCrypto from 'eth-crypto';

import './App.css';
import Password from './artifacts/contracts/Password.sol/Password.json'

const InputDataDecoder = require('ethereum-input-data-decoder');
const PasswordAddress = "0xD863611acb6f18dA0AF00Ced57d83a2b8757DcA2"


function App() {
  const [tag, setTagValue] = useState('')
  const [password, setPasswordValue] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  var [historyData] = useState([])


  async function requestAccount() {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  }

  async function fetchHistory() {
    if (!privateKey) return
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount()
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const ethAddress = await signer.getAddress()

      const etherscanProvider = new ethers.providers.EtherscanProvider("ropsten");
      const history = await etherscanProvider.getHistory(ethAddress);
      const decoder = new InputDataDecoder(Password.abi);


      var i;
      for (i in history) {
        var addToHistory = false;
        if (history[i].to === PasswordAddress && history[i].data !== "0x"){
          addToHistory = true;
          const result = decoder.decodeData(history[i].data);
          // decrypt with private key
          const result_inputs_0  = await EthCrypto.decryptWithPrivateKey(
            privateKey, 
            {
              'iv':result.inputs[0][0],
              'ephemPublicKey':result.inputs[0][1],
              'ciphertext':result.inputs[0][2],
              'mac':result.inputs[0][3],
            }
          );
          const result_inputs_1  = await EthCrypto.decryptWithPrivateKey(
            privateKey, 
            {
              'iv':result.inputs[1][0],
              'ephemPublicKey':result.inputs[1][1],
              'ciphertext':result.inputs[1][2],
              'mac':result.inputs[1][3],
            }
          );
          // Remove data with repeated tag from history
          var ii;
          for (ii in historyData){
            // remove old data with same tag
            if (historyData[ii].tag === result_inputs_0 && historyData[ii].timestamp < history[i].timestamp){
              historyData.splice(ii,1);
              break;
            }
            // don't add data in case newer with same tag exist
            else if(historyData[ii].tag === result_inputs_0 && historyData[ii].timestamp >= history[i].timestamp){
              addToHistory = false;
              break;
            }
          }
          if (addToHistory === true){
            let subHistory = {};
            subHistory.tag = result_inputs_0
            subHistory.password = result_inputs_1
            subHistory.timestamp = history[i].timestamp
            historyData.push(subHistory);
          }
        }
      }
      console.log(historyData);
    }
  }

  async function setPassword() {
    if (!password) return
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount()
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log({ provider })
      const signer = provider.getSigner()
      const contract = new ethers.Contract(PasswordAddress, Password.abi, signer)
      // get public key
      const ethAddress = await signer.getAddress()
      const hash = await ethers.utils.keccak256(ethAddress)
      const sig = await signer.signMessage(ethers.utils.arrayify(hash))
      const pk0 = ethers.utils.recoverPublicKey(
        ethers.utils.arrayify(ethers.utils.hashMessage(ethers.utils.arrayify(hash))),
        sig
      )

      const pk = pk0.substring(2)
      const encryptedTag = await EthCrypto.encryptWithPublicKey(pk, tag);
      const encryptedTagArray = [
        encryptedTag['iv'],
        encryptedTag['ephemPublicKey'],
        encryptedTag['ciphertext'],
        encryptedTag['mac']
      ]
      const encryptedPassword = await EthCrypto.encryptWithPublicKey(pk, password);
      const encryptedPasswordArray = [
        encryptedPassword['iv'],
        encryptedPassword['ephemPublicKey'],
        encryptedPassword['ciphertext'],
        encryptedPassword['mac']
      ]
      const transaction = await contract.setPassword(encryptedTagArray, encryptedPasswordArray)

      console.log({ encryptedTagArray })
      console.log({ encryptedPasswordArray })
      await transaction.wait()
    }
  }


  return (
    <div className="App">
      <header className="App-header">
        <button onClick={fetchHistory}>Fetch History</button>
        <input onChange={e => setPrivateKey(e.target.value)} placeholder="Private Key" />
        <button onClick={setPassword}>Set Password</button>
        <input onChange={e => setTagValue(e.target.value)} placeholder="Set Tag" />
        <input onChange={e => setPasswordValue(e.target.value)} placeholder="Set Password" />
      </header>
      
    </div>
  );
}

export default App;
