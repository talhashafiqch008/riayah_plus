
import { useEffect } from 'react';

export function ConsoleSuppressor() {
 useEffect(() => {
 const originalLog = console.log;
 console.log = function(...args: unknown[]) {
 if (
 args[0] &&
 typeof args[0] === 'string' &&
 args[0].indexOf('Locize') !== -1
 ) {
 return;
 }
 originalLog.apply(console, args);
 };
 }, []);

 return null;
}
