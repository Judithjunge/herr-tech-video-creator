export default function Page() {
  if (typeof window !== 'undefined') {
    window.location.replace('/video/');
  }
  return null;
}

export async function getServerSideProps() {
  return { redirect: { destination: '/', permanent: false } };
}
