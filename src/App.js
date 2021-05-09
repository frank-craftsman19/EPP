import React, { useState } from 'react';
import { ethers } from 'ethers';

import './App.css';
import Password from './artifacts/contracts/Password.sol/Password.json'

const InputDataDecoder = require('ethereum-input-data-decoder');
const PasswordAddress = "0x17094FB464e7e9e1A601Cc353274D64ecd7eF448"


function App() {
  const [tag, setTagValue] = useState('')
  const [password, setPasswordValue] = useState('')
  var [historyData] = useState([])


  async function requestAccount() {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  }

  async function fetchHistory() {
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount()
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const ethAddress = await signer.getAddress()

      const etherscanProvider = new ethers.providers.EtherscanProvider("ropsten");
      const history = await etherscanProvider.getHistory(ethAddress);
      const decoder = new InputDataDecoder(Password.abi);

      //get private key

      var i;
      for (i in history) {
        var addToHistory = false;
        if (history[i].to === PasswordAddress && history[i].data !== "0x"){
          addToHistory = true;
          const result = decoder.decodeData(history[i].data);
          // Remove data with repeated tag from history
          var ii;
          for (ii in historyData){
            // remove old data with same tag
            if (historyData[ii].tag === result.inputs[0] && historyData[ii].timestamp < history[i].timestamp){
              historyData.splice(ii,1);
              break;
            }
            // don't add data in case newer with same tag exist
            else if(historyData[ii].tag === result.inputs[0] && historyData[ii].timestamp >= history[i].timestamp){
              addToHistory = false;
              break;
            }
          }
          if (addToHistory === true){
            let subHistory = {};
            subHistory.tag = result.inputs[0]
            subHistory.password = result.inputs[1]
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
      const transaction = await contract.setPassword(tag, password)
      await transaction.wait()
    }
  }


  return (
    <div className="App">
      <header className="App-header">
        <button onClick={fetchHistory}>Fetch History</button>
        <button onClick={setPassword}>Set Password</button>
        <input onChange={e => setTagValue(e.target.value)} placeholder="Set Tag" />
        <input onChange={e => setPasswordValue(e.target.value)} placeholder="Set Password" />
      </header>
      
    </div>
  );
}

export default App;
