import React, { useState } from 'react';
import { ethers } from 'ethers';
import { encrypt } from 'eth-sig-util';
import { Buffer } from 'buffer/';
import InputDataDecoder from 'ethereum-input-data-decoder';
import * as ethUtil from 'ethereumjs-util';

import './App.css';
import TagButton from '../src/components/TagButton'
import Password from './artifacts/contracts/Password.sol/Password.json'

const PasswordAddress = "0xfE94b6f3185F1D98c7baE193A16EeEC068baC817"


function App() {
  const [tag, setTagValue] = useState('')
  const [password, setPasswordValue] = useState('')
  var [historyData, setHistoryData] = useState([])


  async function requestAccount(){
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0];
  }


  var handle = (promise) => {
    return promise
      .then(data => ([data, undefined]))
      .catch(error => Promise.resolve([undefined, error]));
  }


  async function getEncryptionPublicKey(account) {
    const [encryptionPublicKey, ePublicKeyErr] = await handle(window.ethereum.request({ 
      method: 'eth_getEncryptionPublicKey', params: [account],
    }));

    if (typeof ePublicKeyErr === 'undefined'){
      return encryptionPublicKey
    }
    else {
      if(ePublicKeyErr.code === 4001){
        // EIP-1193 userRejectedRequest error
        console.error("We can't encrypt anything without the key.");
      }
      else { console.error(ePublicKeyErr) }
    }
  }


  function encryptMessage(encryptionPublicKey, message) {
    let encryptedMessage = ethUtil.bufferToHex(
      Buffer.from(
        JSON.stringify(
          encrypt(
            encryptionPublicKey,
            { data: message },
            'x25519-xsalsa20-poly1305'
          )
        ), 'utf8'
      )
    );
    return encryptedMessage
  }

  async function fetchHistory() {
    if (typeof window.ethereum !== 'undefined') {
      const account = await requestAccount()
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const ethAddress = await signer.getAddress()

      const etherscanProvider = new ethers.providers.EtherscanProvider("ropsten");
      const history = await etherscanProvider.getHistory(ethAddress);

      const decoder = new InputDataDecoder(Password.abi);

      historyData = [];
      var i;
      for (i in history) {
        var addToHistory = false;
        if (history[i].to === PasswordAddress && history[i].data !== "0x"){
          addToHistory = true;
          const result = decoder.decodeData(history[i].data);

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
            subHistory.account = account
            historyData.push(subHistory);
          }
        }
      }
      if (historyData){
        setHistoryData(historyData);
        console.log(historyData);
      }
    }
  }

  async function setPassword() {
    if (!password) return
    if (typeof window.ethereum !== 'undefined') {
      const account = await requestAccount()
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log({ provider })
      const signer = provider.getSigner()
      const contract = new ethers.Contract(PasswordAddress, Password.abi, signer)
      // get public key
      const pk = await getEncryptionPublicKey(account)
      const encryptedPassword = encryptMessage(pk, password);
      const transaction = await contract.setPassword(tag, encryptedPassword)
      console.log({ tag },": ", { encryptedPassword })
      await transaction.wait()
    }
  }


  return (
    <div className="App">
      <header className="App-header">
        <button onClick={fetchHistory}>Fetch History</button>
        <div>
          <TagButton props={historyData}></TagButton>
        </div>
        <button onClick={setPassword}>Set Password</button>
        <input onChange={e => setTagValue(e.target.value)} placeholder="Set Tag" />
        <input onChange={e => setPasswordValue(e.target.value)} placeholder="Set Password" />

      </header>
      
    </div>
  );
}

export default App;