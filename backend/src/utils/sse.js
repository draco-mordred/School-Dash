// Map of userId -> Set of client responses
const clients = new Map();
// Track heartbeat intervals per Response so we can clear them on close
const heartbeats = new WeakMap();
export function addSSEClient(req, res) {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // send a ping immediately
    res.write(`event: hello\ndata: ${JSON.stringify({ now: new Date().toISOString() })}\n\n`);
    const userId = req?.user?._id?.toString?.();
    if (!userId) {
        // If we cannot determine user, keep in a generic bucket under '_anon'
        const set = clients.get('_anon') || new Set();
        set.add(res);
        clients.set('_anon', set);
        reqOnClose(res, () => set.delete(res));
        return;
    }
    const set = clients.get(userId) || new Set();
    set.add(res);
    clients.set(userId, set);
    // send periodic comment pings to keep the connection alive
    const interval = setInterval(() => {
        try {
            res.write(`: ping ${new Date().toISOString()}\n\n`);
        }
        catch (err) {
            // ignore write errors — cleanup will remove client
        }
    }, 15000);
    heartbeats.set(res, interval);
    reqOnClose(res, () => {
        const s = clients.get(userId);
        if (s) {
            s.delete(res);
            if (s.size === 0)
                clients.delete(userId);
        }
        const iv = heartbeats.get(res);
        if (iv)
            clearInterval(iv);
        heartbeats.delete(res);
    });
}
function reqOnClose(res, cb) {
    try {
        // prefer socket close
        res.on && res.on('close', cb);
        res.on && res.on('finish', cb);
        // fallback: when connection ends
    }
    catch { }
}
export function sendSSE(event, data, userId) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const targets = [];
    if (userId) {
        const set = clients.get(userId);
        if (set)
            targets.push(...Array.from(set));
    }
    else {
        // broadcast to all
        for (const set of clients.values())
            targets.push(...Array.from(set));
    }
    for (const res of targets) {
        try {
            res.write(`event: ${event}\ndata: ${payload}\n\n`);
        }
        catch (err) {
            try {
                res.end();
            }
            catch { }
            // remove from all sets
            for (const [k, set] of clients.entries()) {
                if (set.has(res)) {
                    set.delete(res);
                    if (set.size === 0)
                        clients.delete(k);
                }
            }
        }
    }
}
export default { addSSEClient, sendSSE };
