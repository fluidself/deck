import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en-us">
        <Head>
          <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        <body className="bg-gray-900 text-gray-100 font-display">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
