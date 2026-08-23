import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const BACKEND = 'http://localhost:3000';

async function login(identifier, password) {
  const res = await fetch(`${BACKEND}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${identifier}: ${JSON.stringify(body)}`);
  return body;
}

async function run() {
  try {
    console.log('Logging in userA...');
    const a = await login('userA', 'Niyibeshaho1');
    console.log('UserA token/id:', a.token, a.user.id);

    console.log('Logging in elise3...');
    const b = await login('elise3', 'Niyibeshaho1');
    console.log('Elise3 token/id:', b.token, b.user.id);

    const socketOpts = { path: '/api/socket.io', auth: () => ({ token: a.token }) };
    const socketA = io('http://localhost:3000', { path: '/api/socket.io', auth: () => ({ token: a.token }), extraHeaders: { origin: 'http://localhost:5173' } });
    const socketB = io('http://localhost:3000', { path: '/api/socket.io', auth: () => ({ token: b.token }), extraHeaders: { origin: 'http://localhost:5173' } });

    socketA.on('connect', () => {
      console.log('[A] connected', socketA.id);
      socketA.emit('join', { username: 'userA' }, (resp) => {
        console.log('[A] join ack', resp);
      });
    });

    socketB.on('connect', () => {
      console.log('[B] connected', socketB.id);
      socketB.emit('join', { username: 'elise3' }, (resp) => {
        console.log('[B] join ack', resp);
      });
    });

    // Wait until both sockets are connected before sending message
    const waitForBothConnected = () => new Promise((resolve) => {
      const check = () => {
        if (socketA.connected && socketB.connected) return resolve();
        setTimeout(check, 100);
      };
      check();
    });

    await waitForBothConnected();
    console.log('Both sockets connected — now proceeding');

    // After both joined, have B send a message to A's chat to trigger updateUserLastSeen
    setTimeout(() => {
      const chatId = `chat-${['userA','elise3'].sort().join('-')}`;
      console.log('[B] sending message to chat', chatId);
      socketB.emit('send_message', { chatId, message: 'hello from B' }, (resp) => {
        console.log('[B] send_message ack', resp);
      });
    }, 500);

    const onPresence = (payload) => {
      console.log('[presence event]', JSON.stringify(payload));
    };

    socketA.on('user_presence_change', onPresence);
    socketB.on('user_presence_change', onPresence);

    // After both joined, have B send a message to A's chat to trigger updateUserLastSeen
    setTimeout(() => {
      const chatId = `chat-${['userA','elise3'].sort().join('-')}`;
      console.log('[B] sending message to chat', chatId);
      socketB.emit('send_message', { chatId, message: 'hello from B' }, (resp) => {
        console.log('[B] send_message ack', resp);
      });
    }, 3000);

    // Run for 10s then exit
    setTimeout(() => {
      socketA.close();
      socketB.close();
      console.log('Done, exiting');
      process.exit(0);
    }, 12000);

  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  }
}

run();
