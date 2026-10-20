import React from 'react';
import { motion } from 'framer-motion';

// The Newbi "N" and its dot, drawn live: the outline traces itself, the letter fills in,
// the dot drops in and bounces, then the whole mark exhales and the loop restarts.
const N_PATH = 'M77,296 L182,283 L292,490 L270,250 L422,238 L382,645 L287,655 L160,422 L181,670 L80,678 Z';
const LOOP = 2.6;
const times = [0, 0.38, 0.55, 0.85, 1];

const NLoader = ({ size = 96, color = '#39FF14' }) => (
    <div role="status" aria-label="Loading" className="relative" style={{ width: size, height: size }}>
        <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ backgroundColor: color }}
            animate={{ opacity: [0, 0, 0.35, 0.1, 0], scale: [0.7, 0.7, 1.15, 1, 0.8] }}
            transition={{ duration: LOOP, times, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.svg
            viewBox="68 178 560 560"
            className="relative h-full w-full overflow-visible"
            animate={{ scale: [0.96, 0.96, 1.02, 1, 0.96] }}
            transition={{ duration: LOOP, times, repeat: Infinity, ease: 'easeInOut' }}
        >
            <motion.path
                d={N_PATH}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth={14}
                className="fill-black stroke-black dark:fill-white dark:stroke-white"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{
                    pathLength: [0, 1, 1, 1, 0],
                    fillOpacity: [0, 0, 1, 1, 0],
                    strokeOpacity: [1, 1, 1, 1, 0],
                }}
                transition={{ duration: LOOP, times, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
                cx={540}
                cy={594}
                r={80}
                fill={color}
                style={{ transformOrigin: '540px 594px', transformBox: 'view-box' }}
                animate={{
                    scale: [0, 0, 1.35, 1, 0],
                    y: [-120, -120, 0, 0, 0],
                    opacity: [0, 0, 1, 1, 0],
                }}
                transition={{ duration: LOOP, times: [0, 0.45, 0.62, 0.85, 1], repeat: Infinity, ease: 'easeOut' }}
            />
        </motion.svg>
    </div>
);

export { NLoader };
export default NLoader;
