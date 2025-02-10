import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat';

const app = express();
const port = 3010;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/chat', chatRouter);

// Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
