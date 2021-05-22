var handle = (promise) => {
  return promise
    .then(data => ([data, undefined]))
    .catch(error => Promise.resolve([undefined, error]));
}

async function decryptMessage(encryptedMessage, account) {
  console.log(`encryptedMessage: ${encryptedMessage}`)
  const [decryptedMessage,decryptErr] = await handle(window.ethereum.request({ 
    method: 'eth_decrypt', 
    params: [encryptedMessage, account],
  }));

  if(decryptErr) {console.error(decryptErr.message)}
  else {
    console.log(`decryptedMessage: ${decryptedMessage}`)
    return decryptedMessage
  }
}

function TagButton({ props }) {
  if (Array.isArray(props)){
    return <> 
      { props.map((prop) => (
        <button onClick={ async (e) =>  {
        const arrayString = e.target.value;
        const n = arrayString.indexOf(",");
        const password = arrayString.substring(0, n);
        const account = arrayString.substring(n+1, );
        
        await decryptMessage(password, account) 
        }}
        key={prop.tag} value={[prop.password, prop.account]}>
          {prop.tag}
        </button> ))
      }
    </>
  }
  return null
}
  export default TagButton;