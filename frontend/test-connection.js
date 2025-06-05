const { JsonRpcProvider } = require('ethers');

async function testConnection() {
  console.log('Testing connection to RISE testnet...\n');
  
  const rpcUrl = 'https://testnet.riselabs.xyz/';
  
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Get network info
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', {
      name: network.name,
      chainId: network.chainId.toString(),
    });
    
    // Get latest block
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Latest block number:', blockNumber);
    
    // Test contract call
    const contractAddress = '0x21a079D1adc66B7db7F6440a29dA9488339b8E40';
    const code = await provider.getCode(contractAddress);
    console.log('✅ Contract deployed:', code !== '0x');
    
    // Test WebSocket
    console.log('\nTesting WebSocket connection...');
    const ws = new WebSocket('wss://testnet.riselabs.xyz/ws');
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      
      // Send test subscription
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'rise_subscribe',
        params: ['logs', { address: contractAddress }]
      }));
    });
    
    ws.on('message', (data) => {
      console.log('✅ WebSocket response:', data.toString());
      ws.close();
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
  } catch (error) {
    console.error('Connection error:', error);
  }
}

testConnection();