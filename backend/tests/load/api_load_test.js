// load test script for api endpoints using k6
// run with: k6 run api_load_test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

// test configuration
export const options = {
	thresholds: {
		// assert that 99% of requests finish within 3000ms
		http_req_duration: ['p(99) < 3000']
	},
	// ramp the number of virtual users up and down
	stages: [
		{ duration: '30s', target: 15 },
		{ duration: '1m', target: 15 },
		{ duration: '20s', target: 0 }
	]
};

// simulated user behavior
export default function () {
	let res = http.get(
		'http://localhost:8000/teams/caccamise-1/join/7WbQlmua1JST3OMnmuNXJ2JDv'
	);
	// validate response status
	check(res, { 'status was 200': (r) => r.status == 200 });
	sleep(1);
}
