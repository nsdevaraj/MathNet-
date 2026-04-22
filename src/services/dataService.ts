import { QuizQuestion, QuizOption } from '../types';

const FALLBACK_DATA: QuizQuestion[] = [
  {
    id: 1,
    subject: "Mathematics",
    question: "If $f(x) = x^2 + 2x + 1$, what is $f(1)$?",
    options: [],
    answer: "4",
    solution: "Substitute $x=1$: $f(1) = 1^2 + 2(1) + 1 = 1 + 2 + 1 = 4$."
  }
];

const mapSubject = (shortSubject: string): string => {
  const map: Record<string, string> = {
    'phy': 'Physics',
    'chem': 'Chemistry',
    'math': 'Mathematics',
    'Algebra': 'Algebra',
    'Geometry': 'Geometry',
    'Number Theory': 'Number Theory',
    'Discrete Mathematics': 'Discrete Mathematics'
  };
  return map[shortSubject] || map[shortSubject?.toLowerCase()] || shortSubject || 'General';
};

const normalizeData = (data: any, offsetId: number = 0): QuizQuestion[] => {
  const list = Array.isArray(data.questions) ? data.questions : (Array.isArray(data) ? data : []);

  return list.map((item: any, index: number): QuizQuestion | null => {
    if (!item || typeof item !== 'object') return null;

    const qText = item.question || "Question Text Missing";
    const answer = item.gold || item.answer || "See Solution";
    const subject = mapSubject(item.subject);
    const options: QuizOption[] = item.options || [];

    const idVal = Number(item.index || item.id);
    const finalId = !isNaN(idVal) && idVal !== 0 ? idVal : offsetId + index + 1;

    return {
        id: finalId,
        question: qText,
        options,
        answer: String(answer),
        solution: item.solution || "",
        subject: String(subject)
    };
  }).filter((q): q is QuizQuestion => q !== null && !!q.question); 
};

/**
 * Background streaming fetcher. Downloads chunks sequentially to keep the UI
 * responsive and memory stable.
 */
export const streamQuestions = async (
  onChunkLoaded: (chunk: QuizQuestion[], progress: number, isComplete: boolean) => void,
  onError: (err: any) => void
) => {
  try {
    let chunks: string[] = [];
    try {
      const indexRes = await fetch(`${import.meta.env.BASE_URL}mathnet_index.json`);
      if (indexRes.ok) {
        const indexData = await indexRes.json();
        chunks = indexData.chunks || [];
      }
    } catch (e) {
        console.warn("Could not find chunk index, will attempt fallback single file.");
    }

    // Fallback backward compatibility
    if (chunks.length === 0) {
       const res = await fetch(`${import.meta.env.BASE_URL}mathnet.json`);
       if (!res.ok) {
         // Try one last thing, maybe it's just mathnet_0.json without an index
         const res0 = await fetch(`${import.meta.env.BASE_URL}mathnet_0.json`);
         if(res0.ok) {
            const chunkData = normalizeData(await res0.json());
            onChunkLoaded(chunkData, 100, true);
            return;
         }
         throw new Error("Fallback fetch failed");
       }
       const chunkData = normalizeData(await res.json());
       onChunkLoaded(chunkData, 100, true);
       return;
    }

    // Stream chunks progressively
    let accumulatedCount = 0;
    for (let i = 0; i < chunks.length; i++) {
        const res = await fetch(`${import.meta.env.BASE_URL}${chunks[i]}`);
        if (!res.ok) continue;
        
        const rawData = await res.json();
        const chunkData = normalizeData(rawData, accumulatedCount);
        accumulatedCount += chunkData.length;
        
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        onChunkLoaded(chunkData, progress, i === chunks.length - 1);
    }

  } catch (err) {
    console.warn("Stream failed, resorting to fallback data", err);
    onChunkLoaded(FALLBACK_DATA, 100, true);
    onError(err);
  }
};
