import http from 'http';

export async function getQuestionPointsFromQnService(qnServiceUrl: string, questionId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = `${qnServiceUrl}/questions/${questionId}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const obj = JSON.parse(data);
          if (typeof obj.points === 'number') {
            resolve(obj.points);
          } else {
            reject(new Error('No points field in response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}
