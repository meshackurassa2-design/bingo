import { Movie } from '../types';

export const mockMovies: Movie[] = [
  {
    id: '1',
    title: 'Big Buck Bunny',
    description: 'A large and lovable rabbit deals with three bullying rodents: a flying squirrel, a marmot, and a chinchilla.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/1200px-Big_buck_bunny_poster_big.jpg',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    genre: 'Animation',
    releaseYear: 2008,
  },
  {
    id: '2',
    title: 'Elephant Dream',
    description: 'The first computer-generated animated short film made almost entirely with free and open source software.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_s5_pro.jpg/1200px-Elephants_Dream_s5_pro.jpg',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    genre: 'Animation',
    releaseYear: 2006,
  },
  {
    id: '3',
    title: 'Sintel',
    description: 'A lonely young woman, Sintel, helps and befriends a dragon, whom she calls Scales. But when he is kidnapped by an adult dragon, Sintel decides to embark on a dangerous quest to find her lost friend Scales.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Sintel_poster.jpg/1200px-Sintel_poster.jpg',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    genre: 'Animation',
    releaseYear: 2010,
  },
  {
    id: '4',
    title: 'Tears of Steel',
    description: 'Tears of Steel was realized with crowd-funding by users of the open source 3D creation tool Blender. Target was to improve and test a complete open and free pipeline for visual effects in film - and to make a compelling sci-fi film in Amsterdam, the Netherlands.',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Tears_of_Steel_poster.jpg/1200px-Tears_of_Steel_poster.jpg',
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    genre: 'Sci-Fi',
    releaseYear: 2012,
  }
];
