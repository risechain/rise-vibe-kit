import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  User: p.createTable({
    id: p.string(), // address
    userId: p.string(),
    registeredAt: p.bigint(),
    registeredAtBlock: p.bigint(),
    messageCount: p.int(),
    karma: p.int(),
  }),
  
  Message: p.createTable({
    id: p.string(), // msgId
    user: p.string().references("User.id"),
    userId: p.string(),
    content: p.string(),
    timestamp: p.bigint(),
    blockNumber: p.bigint(),
    transactionHash: p.string(),
  }),
  
  KarmaEvent: p.createTable({
    id: p.string(), // unique ID
    user: p.string().references("User.id"),
    karma: p.int(),
    timestamp: p.bigint(),
    blockNumber: p.bigint(),
    transactionHash: p.string(),
  }),
}));