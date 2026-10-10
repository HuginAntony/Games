import { Category, GameSettings, Question } from '../types/game';
// Original, reviewed questions using stable facts. First answer in each row is correct.
const decks: Record<Exclude<Category, 'mixed'>, string[][]> = {
  science: [
    ['What is the chemical symbol for gold?', 'Au', 'Ag', 'Fe', 'Pb'],
    ['Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Mercury', 'Neptune'],
    ['Which gas do plants absorb during photosynthesis?', 'Carbon dioxide', 'Oxygen', 'Helium', 'Hydrogen'],
    ['What force keeps planets in orbit around the Sun?', 'Gravity', 'Friction', 'Magnetism', 'Buoyancy'],
    ['What is the basic unit of life?', 'Cell', 'Atom', 'Organ', 'Tissue'],
    ['Which organ pumps blood around the body?', 'Heart', 'Liver', 'Lung', 'Kidney'],
    ['How many legs does an insect have?', 'Six', 'Four', 'Eight', 'Ten'],
    ['Which part of an atom has a negative charge?', 'Electron', 'Proton', 'Neutron', 'Nucleus'],
    ['What is H₂O commonly called?', 'Water', 'Salt', 'Sugar', 'Oxygen'],
    ['Which instrument measures atmospheric pressure?', 'Barometer', 'Thermometer', 'Ammeter', 'Odometer'],
    ['Which vitamin can skin produce in sunlight?', 'Vitamin D', 'Vitamin C', 'Vitamin B12', 'Vitamin K'],
    ['Which material is the hardest natural mineral?', 'Diamond', 'Quartz', 'Talc', 'Calcite'],
    ['Which gas makes up most of Earth’s atmosphere?', 'Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide'],
    ['What is the SI unit of electric current?', 'Ampere', 'Volt', 'Ohm', 'Watt'],
    ['Which type of wave is sound in air?', 'Longitudinal', 'Transverse', 'Electromagnetic', 'Gravitational'],
    ['Which organelle is a major site of cellular respiration?', 'Mitochondrion', 'Ribosome', 'Nucleus', 'Golgi apparatus'],
    ['What is the pH of pure water at 25°C?', '7', '1', '5', '14'],
    ['Which scientist proposed general relativity?', 'Albert Einstein', 'Isaac Newton', 'Marie Curie', 'Charles Darwin'],
    ['What process turns a liquid into a gas?', 'Evaporation', 'Condensation', 'Freezing', 'Deposition'],
    ['Which element has atomic number 1?', 'Hydrogen', 'Helium', 'Lithium', 'Carbon'],
  ],
  history: [
    ['In which year did the first crewed Moon landing occur?', '1969', '1959', '1979', '1989'],
    ['Who was the first president of the United States?', 'George Washington', 'John Adams', 'Thomas Jefferson', 'James Madison'],
    ['Which civilisation built the pyramids at Giza?', 'Ancient Egyptians', 'Romans', 'Vikings', 'Aztecs'],
    ['In which year did World War II end?', '1945', '1939', '1918', '1950'],
    ['Which city was buried by Vesuvius in AD 79?', 'Pompeii', 'Athens', 'Carthage', 'Sparta'],
    ['Which document was sealed in England in 1215?', 'Magna Carta', 'Domesday Book', 'Bill of Rights', 'Treaty of Versailles'],
    ['Who developed the movable-type printing press in Europe?', 'Johannes Gutenberg', 'Galileo Galilei', 'Leonardo da Vinci', 'Isaac Newton'],
    ['In which ancient civilisation was Julius Caesar a leader?', 'Ancient Rome', 'Ancient Egypt', 'Ancient Persia', 'Ancient China'],
    ['In which year did the Berlin Wall fall?', '1989', '1961', '1999', '1975'],
    ['Which ship sank on its maiden voyage in 1912?', 'Titanic', 'Mayflower', 'Endeavour', 'Beagle'],
    ['Which country gave the Statue of Liberty to the United States?', 'France', 'Spain', 'Italy', 'Germany'],
    ['Who was the first woman to win a Nobel Prize?', 'Marie Curie', 'Ada Lovelace', 'Rosalind Franklin', 'Florence Nightingale'],
    ['Which battle in 1815 ended Napoleon’s rule?', 'Waterloo', 'Hastings', 'Agincourt', 'Trafalgar'],
    ['Which ancient city hosted the original Olympic Games?', 'Olympia', 'Rome', 'Alexandria', 'Troy'],
    ['Which English king had six wives?', 'Henry VIII', 'Henry V', 'Richard III', 'Edward VI'],
    ['In which century did the French Revolution begin?', '18th', '16th', '17th', '19th'],
    ['Which explorer’s expedition first circumnavigated the globe?', 'Ferdinand Magellan', 'Christopher Columbus', 'James Cook', 'Marco Polo'],
    ['Who painted the ceiling of the Sistine Chapel?', 'Michelangelo', 'Raphael', 'Donatello', 'Botticelli'],
    ['Which civilisation used cuneiform writing first?', 'Sumerians', 'Romans', 'Incas', 'Vikings'],
    ['Which country launched Sputnik 1 in 1957?', 'Soviet Union', 'United States', 'China', 'France'],
  ],
  geography: [
    ['What is the capital of Japan?', 'Tokyo', 'Kyoto', 'Osaka', 'Seoul'],
    ['Which ocean is the largest?', 'Pacific', 'Atlantic', 'Indian', 'Arctic'],
    ['On which continent is Kenya?', 'Africa', 'Asia', 'Europe', 'South America'],
    ['Which country contains the city of Barcelona?', 'Spain', 'Portugal', 'Italy', 'France'],
    ['Which river flows through London?', 'Thames', 'Seine', 'Danube', 'Rhine'],
    ['What is the capital of Canada?', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal'],
    ['Which country is shaped like a boot?', 'Italy', 'Greece', 'Norway', 'Chile'],
    ['Which desert covers much of northern Africa?', 'Sahara', 'Gobi', 'Atacama', 'Kalahari'],
    ['In which country is Mount Fuji?', 'Japan', 'China', 'Nepal', 'Thailand'],
    ['Which continent contains the South Pole?', 'Antarctica', 'Australia', 'Africa', 'South America'],
    ['What is the capital of Australia?', 'Canberra', 'Sydney', 'Melbourne', 'Perth'],
    ['Which country has the cities of Mumbai and Delhi?', 'India', 'Pakistan', 'Bangladesh', 'Nepal'],
    ['Which mountain range separates much of Spain and France?', 'Pyrenees', 'Alps', 'Andes', 'Himalayas'],
    ['Which country contains Machu Picchu?', 'Peru', 'Mexico', 'Brazil', 'Colombia'],
    ['Which ocean lies between Africa and Australia?', 'Indian', 'Atlantic', 'Arctic', 'Southern'],
    ['What is the capital of Brazil?', 'Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'],
    ['Which European river passes through Vienna and Budapest?', 'Danube', 'Rhine', 'Seine', 'Volga'],
    ['Which country contains the Great Barrier Reef?', 'Australia', 'Indonesia', 'Philippines', 'New Zealand'],
    ['What is the capital of Iceland?', 'Reykjavík', 'Oslo', 'Helsinki', 'Copenhagen'],
    ['Which country is home to the Serengeti National Park?', 'Tanzania', 'Egypt', 'Morocco', 'Namibia'],
  ],
  entertainment: [
    ['Who wrote the play Romeo and Juliet?', 'William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Oscar Wilde'],
    ['Which instrument typically has 88 keys?', 'Piano', 'Violin', 'Trumpet', 'Flute'],
    ['Who painted the Mona Lisa?', 'Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso', 'Claude Monet'],
    ['Which fictional detective lives at 221B Baker Street?', 'Sherlock Holmes', 'Hercule Poirot', 'Miss Marple', 'Nancy Drew'],
    ['Which composer wrote The Four Seasons?', 'Antonio Vivaldi', 'Mozart', 'Beethoven', 'Bach'],
    ['Which movie features the song Let It Go?', 'Frozen', 'Moana', 'Tangled', 'Encanto'],
    ['Who wrote The Hobbit?', 'J. R. R. Tolkien', 'C. S. Lewis', 'Roald Dahl', 'Lewis Carroll'],
    ['Which superhero is also called Peter Parker?', 'Spider-Man', 'Batman', 'Superman', 'Iron Man'],
    ['What is the name of the cowboy toy in Toy Story?', 'Woody', 'Buzz', 'Rex', 'Hamm'],
    ['Which band released Abbey Road?', 'The Beatles', 'Queen', 'The Rolling Stones', 'Pink Floyd'],
    ['Who wrote Pride and Prejudice?', 'Jane Austen', 'Charlotte Brontë', 'Mary Shelley', 'Virginia Woolf'],
    ['Which artist painted The Starry Night?', 'Vincent van Gogh', 'Salvador Dalí', 'Claude Monet', 'Paul Cézanne'],
    ['Which musical features the song Memory?', 'Cats', 'Wicked', 'Hamilton', 'Chicago'],
    ['Which instrument belongs to the woodwind family?', 'Clarinet', 'Trombone', 'Cello', 'Timpani'],
    ['What is Batman’s home city?', 'Gotham City', 'Metropolis', 'Smallville', 'Central City'],
    ['Which game uses the pieces king, queen and bishop?', 'Chess', 'Checkers', 'Go', 'Backgammon'],
    ['Who created the fictional character Hercule Poirot?', 'Agatha Christie', 'Arthur Conan Doyle', 'Ian Fleming', 'Georges Simenon'],
    ['Which film series features a character called Darth Vader?', 'Star Wars', 'Star Trek', 'Dune', 'Alien'],
    ['Which ballet features the Sugar Plum Fairy?', 'The Nutcracker', 'Swan Lake', 'Giselle', 'Coppélia'],
    ['Which Italian term means very quietly in music?', 'Pianissimo', 'Fortissimo', 'Allegro', 'Presto'],
  ],
  sports: [
    ['How many players per team are on the field in association football?', '11', '9', '10', '12'],
    ['Which sport uses a shuttlecock?', 'Badminton', 'Tennis', 'Squash', 'Volleyball'],
    ['How many rings are in the Olympic symbol?', 'Five', 'Four', 'Six', 'Seven'],
    ['Which sport is played at Wimbledon?', 'Tennis', 'Cricket', 'Golf', 'Rugby'],
    ['How many points is a free throw worth in basketball?', 'One', 'Two', 'Three', 'Four'],
    ['Which sport uses the terms birdie and eagle?', 'Golf', 'Hockey', 'Swimming', 'Boxing'],
    ['How many bases are on a baseball diamond including home?', 'Four', 'Three', 'Five', 'Six'],
    ['In which sport can you score a try?', 'Rugby', 'Football', 'Tennis', 'Basketball'],
    ['What colour jersey identifies the Tour de France overall leader?', 'Yellow', 'Green', 'Red', 'Blue'],
    ['How long is a marathon in kilometres?', '42.195', '40', '21.1', '50'],
    ['Which swimming stroke is named after an insect?', 'Butterfly', 'Crawl', 'Backstroke', 'Breaststroke'],
    ['How many players per team are on a volleyball court?', 'Six', 'Five', 'Seven', 'Eight'],
    ['Which sport uses a puck?', 'Ice hockey', 'Field hockey', 'Lacrosse', 'Handball'],
    ['In tennis, what word means zero points?', 'Love', 'Nil', 'Blank', 'Duck'],
    ['How many balls are bowled in a standard cricket over?', 'Six', 'Five', 'Seven', 'Eight'],
    ['Which athletics event uses a long flexible pole?', 'Pole vault', 'High jump', 'Long jump', 'Triple jump'],
    ['How many pins are used in ten-pin bowling?', 'Ten', 'Nine', 'Twelve', 'Eight'],
    ['Which combat sport uses the term ippon?', 'Judo', 'Boxing', 'Fencing', 'Wrestling'],
    ['In snooker, which ball is worth seven points?', 'Black', 'Pink', 'Blue', 'Brown'],
    ['Which three disciplines form an Olympic triathlon?', 'Swimming, cycling and running', 'Swimming, rowing and running', 'Cycling, fencing and running', 'Swimming, cycling and skiing'],
  ],
};
export function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function getCuratedQuestions(settings: GameSettings): Question[] {
  const categories = settings.category === 'mixed' ? Object.keys(decks) as Exclude<Category, 'mixed'>[] : [settings.category];
  const pool = categories.flatMap(category => decks[category].map((row, i): Question => {
    const answers = shuffle(row.slice(1));
    return { category: category[0].toUpperCase() + category.slice(1), question: row[0], answers, correctIndex: answers.indexOf(row[1]), difficulty: i < 10 ? 'easy' : i < 17 ? 'medium' : 'hard' };
  }));
  const preferred = pool.filter(q => settings.difficulty === 'mixed' || q.difficulty === settings.difficulty);
  return shuffle(preferred.length >= settings.rounds ? preferred : pool).slice(0, settings.rounds);
}
export async function fetchQuestions(amount = 10): Promise<Question[]> {
  const response = await fetch(`/api/questions?amount=${amount}`);
  if (!response.ok) throw new Error('Unable to load questions.');
  return response.json();
}
