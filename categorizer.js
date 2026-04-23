export const categorizeQuestion = (text, subjectStr, chapterStr) => {
  const t = (text + ' ' + (subjectStr||'') + ' ' + (chapterStr||'')).toLowerCase();
  
  // Number Theory
  if (t.match(/divisib|factor|prime|modulo|mod |residue|diophantine|gcd|lcm|totient|primitive root|algebraic number|number theor/)) {
    if (t.match(/divisib|factor|prime|gcd|lcm/)) return { topic: 'Number Theory', subtopic: 'Divisibility / Factorization' };
    if (t.match(/modulo|mod /)) return { topic: 'Number Theory', subtopic: 'Modular Arithmetic' };
    if (t.match(/diophantine/)) return { topic: 'Number Theory', subtopic: 'Diophantine Equations' };
    if (t.match(/residue|primitive root/)) return { topic: 'Number Theory', subtopic: 'Residues and Primitive Roots' };
    if (t.match(/totient|euler|function/)) return { topic: 'Number Theory', subtopic: 'Number-Theoretic Functions' };
    if (t.match(/algebraic number/)) return { topic: 'Number Theory', subtopic: 'Algebraic Number Theory' };
    return { topic: 'Number Theory', subtopic: 'Other' };
  }
  
  // Discrete Mathematics
  if (t.match(/combinator|permutation|combination|graph theor|vertex|edge|logic|algorithm|discrete|graph/)) {
    if (t.match(/combinator|permutation|combination|choose/)) return { topic: 'Discrete Mathematics', subtopic: 'Combinatorics' };
    if (t.match(/graph theor|vertex|edge|bipartite/)) return { topic: 'Discrete Mathematics', subtopic: 'Graph Theory' };
    if (t.match(/algorithm/)) return { topic: 'Discrete Mathematics', subtopic: 'Algorithms' };
    if (t.match(/logic|boolean/)) return { topic: 'Discrete Mathematics', subtopic: 'Logic' };
    return { topic: 'Discrete Mathematics', subtopic: 'Other' };
  }

  // Geometry
  if (t.match(/geometry|triangle|circle|angle|polygon|solid|volume|surface area|euclidean|sphere|cone|cylinder|plane/)) {
    if (t.match(/solid|volume|surface area|sphere|cone|cylinder|polyhedron/)) return { topic: 'Geometry', subtopic: 'Solid Geometry' };
    if (t.match(/non-euclidean|hyperbolic|elliptic/)) return { topic: 'Geometry', subtopic: 'Non-Euclidean Geometry' };
    if (t.match(/differential geometry|manifold|tensor/)) return { topic: 'Geometry', subtopic: 'Differential Geometry' };
    return { topic: 'Geometry', subtopic: 'Plane Geometry' };
  }

  // Algebra
  if (t.match(/algebra|equation|polynomial|matrix|vector|linear|abstract|group|ring|field|inequalit|expression/)) {
    if (t.match(/matrix|vector|linear algebra|eigen|determinant/)) return { topic: 'Algebra', subtopic: 'Linear Algebra' };
    if (t.match(/group|ring|field|abstract algebra|homomorphism|isomorphism/)) return { topic: 'Algebra', subtopic: 'Abstract Algebra' };
    if (t.match(/equation|inequalit/)) return { topic: 'Algebra', subtopic: 'Equations and Inequalities' };
    if (t.match(/expression|polynomial/)) return { topic: 'Algebra', subtopic: 'Algebraic Expressions' };
    if (t.match(/basic|prealgebra|fraction|decimal|percent/)) return { topic: 'Algebra', subtopic: 'Prealgebra / Basic Algebra' };
    return { topic: 'Algebra', subtopic: 'Intermediate Algebra' };
  }

  // Default to Intermediate Algebra if no matches but it's a math question
  return { topic: 'Algebra', subtopic: 'Intermediate Algebra' };
};
