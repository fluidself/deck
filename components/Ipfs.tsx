import { useState, useEffect } from 'react';
import { IPFS, create } from 'ipfs-core';
import type { CID } from 'ipfs-core';

const IpfsComponent = () => {
  const [id, setId] = useState(null);
  const [ipfs, setIpfs] = useState(null);
  const [version, setVersion] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (ipfs) return;

      const node = await create();
      const nodeId = await node.id();
      const nodeVersion = await node.version();
      const nodeIsOnline = node.isOnline();

      setIpfs(node);
      setId(nodeId.id);
      setVersion(nodeVersion.version);
      setIsOnline(nodeIsOnline);
    };

    init();
  }, [ipfs]);

  if (!ipfs) {
    return <h4>Connecting to IPFS...</h4>;
  }

  return (
    <div>
      <h3>IPFS Status</h3>
      <p>ID: {id}</p>
      <p>Version: {version}</p>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
    </div>
  );
};

// const readFile = async (ipfs: IPFS, cid: CID): Promise<string> => {
//   const decoder = new TextDecoder();
//   let content = '';
//   for await (const chunk of ipfs.cat(cid)) {
//     content += decoder.decode(chunk);
//   }

//   return content;
// };

export default IpfsComponent;
