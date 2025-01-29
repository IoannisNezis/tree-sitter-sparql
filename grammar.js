/**
 * @file SPARQL grammar for tree-sitter
 * @author Ioannis Nezis <ioannis@nezis.de>
 * @author Ioannis Nezis <ioannis@nezis.de>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// [155]
const EXPONENT = [
  /[eE]/,
  /[+-]?/,
  /[0-9]+/
]

// [162]
const WS = [
  /\x20/,
  /\x09/,
  /\x0D/,
  /\x0A/
]

// [164]
const PN_CHARS_BASE = [
  /[A-Z]/,
  /[a-z]/,
  /[\u00C0-\u00D6]/,
  /[\u00D8-\u00F6]/,
  /[\u00F8-\u02FF]/,
  /[\u0370-\u037D]/,
  /[\u037F-\u1FFF]/,
  /[\u200C-\u200D]/,
  /[\u2070-\u218F]/,
  /[\u2C00-\u2FEF]/,
  /[\u3001-\uD7FF]/,
  /[\uF900-\uFDCF]/,
  /[\uFDF0-\uFFFD]/,
  /[\u{10000}-\u{EFFFF}]/u
]

// [165]
const PN_CHARS_U = PN_CHARS_BASE.concat('_')

// [167]
const PN_CHARS = PN_CHARS_U.concat([
  '-',
  /[0-9]/,
  /[\u00B7]/,
  /[\u0300-\u036F]/,
  /[\u203F-\u2040]/
])

// [172]
const HEX = [
  /[0-9]/,
  /[A-F]/,
  /[a-f]/
]

// [173]
const PN_LOCAL_ESC = [
  '_',
  '~',
  '.',
  '-',
  '!',
  '$',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  ';',
  '=',
  '/',
  '?',
  '#',
  '@',
  '%'
].map(char => '\\' + char)

String.prototype.toCaseInsensitiv = function() {
  return alias(
    token(new RegExp(
      this
        .split('')
        .map(letter => `[${letter}${letter.toLowerCase()}]`)
        .join('')
    )),
    this
  )
}

module.exports = grammar({
  name: 'sparql',

  extras: $ => [
    $.comment,
    /\s/
  ],

  supertypes: $ => [
    $._expression
  ],

  inline: $ => [
    $.Query
  ],

  word: $ => $.PN_PREFIX,

  rules: {

    unit: $ => optional(choice(
      $.Query,
      $.Update
    )),

    comment: $ => token(prec(-1, /#.*/)),

    // [2]
    Query: $ => seq(
      optional($.Prologue),
      choice(
        $.SelectQuery,
        $.ConstructQuery,
        $.DescribeQuery,
        $.AskQuery,
      ),
      optional($.ValuesClause)
    ),

    // [3, 29-30]
    Update: $ => seq(
      optional($.Prologue),
      seq(
        $.Update1,
        optional(seq(
          ';',
          optional($.Update)
        ))
      )
    ),
    Update1: $ =>
      choice(
        $.Load,
        $.Clear,
        $.Drop,
        $.Add,
        $.Move,
        $.Copy,
        $.Create,
        $.InsertData,
        $.DeleteData,
        $.DeleteWhere,
        $.Modify
      ),

    // [4]
    Prologue: $ => repeat1(choice(
      $.BaseDecl,
      $.PrefixDecl
    )),

    // [5]
    BaseDecl: $ => seq(
      'BASE'.toCaseInsensitiv(),
      $.IRIREF
    ),

    // [6]
    PrefixDecl: $ => seq(
      'PREFIX'.toCaseInsensitiv(),
      $.PNAME_NS,
      $.IRIREF
    ),

    // [7]
    SelectQuery: $ => seq(
      $.SelectClause,
      repeat($.DatasetClause),
      $.WhereClause,
      optional($.SolutionModifier)
    ),

    // [8]
    SubSelect: $ => seq(
      $.SelectClause,
      $.WhereClause,
      optional($.SolutionModifier),
      optional($.ValuesClause)
    ),

    // [9]
    SelectClause: $ => seq(
      'SELECT'.toCaseInsensitiv(),
      optional(choice(
        'DISTINCT'.toCaseInsensitiv(),
        'REDUCED'.toCaseInsensitiv()
      )),
      choice(
        repeat1(choice(
          field('bound_variable', $.VAR),
          $.assignment
        )),
        '*'
      )
    ),

    // [10]
    ConstructQuery: $ => seq(
      'CONSTRUCT'.toCaseInsensitiv(),
      choice(
        seq(
          $.ConstructTemplate,
          repeat($.DatasetClause),
          $.WhereClause,
          optional($.SolutionModifier)
        ),
        seq(
          repeat($.DatasetClause),
          'WHERE'.toCaseInsensitiv(), '{', $.TriplesTemplate, '}',
          optional($.SolutionModifier)
        )
      )
    ),

    // [11]
    DescribeQuery: $ => seq(
      'DESCRIBE'.toCaseInsensitiv(),
      choice(
        repeat1($._var_or_iri),
        '*'
      ),
      repeat($.DatasetClause),
      optional($.WhereClause),
      optional($.SolutionModifier)
    ),

    // [12]
    AskQuery: $ => seq(
      'ASK'.toCaseInsensitiv(),
      repeat($.DatasetClause),
      $.WhereClause,
      optional($.SolutionModifier)
    ),

    // [13]
    DatasetClause: $ => seq(
      'FROM'.toCaseInsensitiv(),
      choice(
        $.DefaultGraphClause,
        $.NamedGraphClause
      )
    ),

    // [14]
    // [16]
    DefaultGraphClause: $ => field('source_selector', $._iri),

    // [15-16]
    NamedGraphClause: $ => seq(
      'NAMED'.toCaseInsensitiv(),
      field('source_selector', $._iri)
    ),

    // [17]
    WhereClause: $ => seq(
      optional('WHERE'.toCaseInsensitiv()),
      $.GroupGraphPattern
    ),

    // [18]
    SolutionModifier: $ => choice(
      // Tree-sitter does not support syntactic rules that match the empty String
      seq(
        $.GroupClause,
        optional($.HavingClause),
        optional($.OrderClause),
        optional($.LimitOffsetClauses)
      ),
      seq(
        optional($.GroupClause),
        $.HavingClause,
        optional($.OrderClause),
        optional($.LimitOffsetClauses)
      ),
      seq(
        optional($.GroupClause),
        optional($.HavingClause),
        $.OrderClause,
        optional($.LimitOffsetClauses)
      ),
      seq(
        optional($.GroupClause),
        optional($.HavingClause),
        optional($.OrderClause),
        $.LimitOffsetClauses
      ),
    ),

    // [19]
    GroupClause: $ => seq(
      'GROUP'.toCaseInsensitiv(),
      'BY'.toCaseInsensitiv(),
      repeat1($.GroupCondition)
    ),

    // [20]
    // NOTE: This rule is altered!
    // BrackettetExpression and assignment is not to specification.
    GroupCondition: $ => choice(
      $.BuildInCall,
      $.FunctionCall,
      $.BrackettedExpression,
      $.assignment,
      field('bound_variable', $.VAR)
    ),

    // [21]
    HavingClause: $ => seq(
      'HAVING'.toCaseInsensitiv(),
      repeat1($.HavingCondition)
    ),

    // [22]
    HavingCondition: $ => $._constraint,

    // [23]
    OrderClause: $ => seq(
      'ORDER'.toCaseInsensitiv(),
      'BY'.toCaseInsensitiv(),
      repeat1($.OrderCondition)
    ),

    // [24]
    OrderCondition: $ => choice(
      seq(
        choice('ASC'.toCaseInsensitiv(), 'DESC'.toCaseInsensitiv()),
        $.BrackettedExpression
      ),
      choice(
        $._constraint,
        $.VAR
      )
    ),

    // [25]
    LimitOffsetClauses: $ => choice(
      seq($.LimitClause, optional($.OffsetClause)),
      seq($.OffsetClause, optional($.LimitClause)
      )
    ),

    // [26]
    LimitClause: $ => seq(
      'LIMIT'.toCaseInsensitiv(),
      $.INTEGER
    ),

    // [27]
    OffsetClause: $ => seq(
      'OFFSET'.toCaseInsensitiv(),
      $.INTEGER
    ),

    // [28]
    ValuesClause: $ => seq('VALUES'.toCaseInsensitiv(), $.DataBlock),

    // [31]
    Load: $ => seq(
      'LOAD'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $._iri,
      optional(seq('INTO'.toCaseInsensitiv(), $.GraphRef))
    ),

    // [32]
    Clear: $ => seq(
      'CLEAR'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $.GraphRefAll
    ),

    // [33]
    Drop: $ => seq(
      'DROP'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $.GraphRefAll
    ),

    // [34]
    Create: $ => seq(
      'CREATE'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $.GraphRef
    ),

    // [35]
    Add: $ => seq(
      'ADD'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $.GraphOrDefault,
      'TO'.toCaseInsensitiv(),
      $.GraphOrDefault
    ),

    // [36]
    Move: $ => seq(
      'MOVE'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $.GraphOrDefault,
      'TO'.toCaseInsensitiv(),
      $.GraphOrDefault
    ),

    // [37]
    Copy: $ => seq(
      'COPY'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $.GraphOrDefault,
      'TO'.toCaseInsensitiv(),
      $.GraphOrDefault
    ),

    // [38]
    InsertData: $ => seq('INSERT'.toCaseInsensitiv(), 'DATA'.toCaseInsensitiv(), $.QuadData),

    // [39]
    DeleteData: $ => seq('DELETE'.toCaseInsensitiv(), 'DATA'.toCaseInsensitiv(), $.QuadData),

    // [40]
    DeleteWhere: $ => seq('DELETE'.toCaseInsensitiv(), 'WHERE'.toCaseInsensitiv(), $.QuadData),

    // [41]
    Modify: $ => seq(
      optional(seq('WITH'.toCaseInsensitiv(), $._iri)),
      choice(
        seq($.DeleteClause, optional($.InsertClause)),
        $.InsertClause
      ),
      repeat($.UsingClause),
      'WHERE'.toCaseInsensitiv(),
      $.GroupGraphPattern
    ),

    // [42]
    DeleteClause: $ => seq('DELETE'.toCaseInsensitiv(), $.QuadData),

    // [43]
    InsertClause: $ => seq('INSERT'.toCaseInsensitiv(), $.QuadData),

    // [44]
    UsingClause: $ => seq(
      'USING'.toCaseInsensitiv(),
      choice(
        $._iri,
        seq('NAMED'.toCaseInsensitiv(), $._iri)
      )
    ),

    // [45]
    GraphOrDefault: $ => choice(
      'DEFAULT'.toCaseInsensitiv(),
      seq(
        optional('GRAPH'.toCaseInsensitiv()),
        $._iri)
    ),

    // [46]
    GraphRef: $ => seq('GRAPH'.toCaseInsensitiv(), $._iri),

    // [47]
    GraphRefAll: $ => choice(
      $.GraphRef,
      'DEFAULT'.toCaseInsensitiv(),
      'NAMED'.toCaseInsensitiv(),
      'ALL'.toCaseInsensitiv()
    ),

    // [48]
    // [49]
    QuadData: $ => seq(
      '{',
      optional($.Quads),
      '}'
    ),

    // [50]
    // NOTE: Here the rule is altered s.t. it does not match the empty String.
    Quads: $ => seq(
      choice(
        $.TriplesTemplate,
        seq(
          $.QuadsNotTriples,
          optional('.'),
          optional($.TriplesTemplate),
        )
      ),
      repeat(seq(
        $.QuadsNotTriples,
        optional('.'),
        optional($.TriplesTemplate),
      )),
    ),

    // [51]
    QuadsNotTriples: $ => seq(
      'GRAPH'.toCaseInsensitiv(),
      $._var_or_iri,
      $.TriplesTemplateBlock
    ),

    //NOTE: These are two extra rules to help with indentation.
    TriplesTemplateBlock: $ => seq(
      '{',
      optional($.TriplesTemplate),
      '}'
    ),


    // [52]
    TriplesTemplate: $ => seq(
      $.TriplesSameSubject,
      repeat(seq(
        '.',
        $.TriplesSameSubject
      )),
      optional('.')
    ),

    // [53]
    // NOTE: In the Spec GroupGraphPatternSub is not optional,
    // this is done here because tree-sitter does not allow rules that match the empty String
    GroupGraphPattern: $ => seq(
      '{',
      optional($.GroupGraphPatternSub),
      '}'
    ),

    // [54]
    // NOTE: Here the rule is altered s.t. it does not match the empty String.
    GroupGraphPatternSub: $ => choice(
      $.SubSelect,
      seq(
        choice(
          $.TriplesBlock,
          seq(
            $._graph_pattern_not_triples,
            optional('.'),
            optional($.TriplesBlock)
          )
        ),
        repeat(seq(
          $._graph_pattern_not_triples,
          optional('.'),
          optional($.TriplesBlock)
        ))
      )
    ),


    // [55]
    TriplesBlock: $ => seq(
      $.TriplesSameSubjectPath,
      repeat(seq(
        '.',
        $.TriplesSameSubjectPath
      )),
      optional('.')
    ),

    // [56]
    _graph_pattern_not_triples: $ => choice(
      $.GroupOrUnionGraphPattern,
      $.OptionalGraphPattern,
      $.MinusGraphPattern,
      $.GraphGraphPattern,
      $.ServiceGraphPattern,
      $.Filter,
      $.Bind,
      $.InlineData
    ),

    // [57]
    OptionalGraphPattern: $ => seq('OPTIONAL'.toCaseInsensitiv(), $.GroupGraphPattern),

    // [58]
    GraphGraphPattern: $ => seq(
      'GRAPH'.toCaseInsensitiv(),
      $._var_or_iri,
      $.GroupGraphPattern
    ),

    // [59]
    ServiceGraphPattern: $ => seq(
      'SERVICE'.toCaseInsensitiv(),
      optional('SILENT'.toCaseInsensitiv()),
      $._var_or_iri,
      $.GroupGraphPattern
    ),

    // [60]
    Bind: $ => seq(
      'BIND'.toCaseInsensitiv(),
      $.assignment
    ),

    // NOTE: This is a auxiliary rule and not in the specification.
    assignment: $ => seq(
      '(',
      $._expression,
      'AS'.toCaseInsensitiv(),
      field('bound_variable', $.VAR),
      ')'
    ),

    // [61]
    InlineData: $ => seq('VALUES'.toCaseInsensitiv(), $.DataBlock),

    // [62]
    DataBlock: $ => choice(
      $._InlineData_one_var,
      $._InlineData_full
    ),

    // [63]
    _InlineData_one_var: $ => seq(
      field('bound_variable', $.VAR),
      '{',
      repeat($._DataBlock_value),
      '}'
    ),

    // [64]
    _InlineData_full: $ => seq(
      choice(
        $.NIL,
        seq(
          '(',
          repeat1(field('bound_variable', $.VAR)),
          ')'
        )
      ),
      '{',
      repeat(choice(
        seq('(', repeat1($._DataBlock_value), ')'),
        $.NIL
      )),
      '}'
    ),

    // [65]
    _DataBlock_value: $ => choice(
      $._iri,
      $.RdfLiteral,
      $._numeric_literal,
      $.boolean_literal,
      'UNDEF'.toCaseInsensitiv()
    ),

    // [66]
    MinusGraphPattern: $ => seq('MINUS'.toCaseInsensitiv(), $.GroupGraphPattern),

    // [67]
    GroupOrUnionGraphPattern: $ => seq(
      $.GroupGraphPattern,
      repeat(seq('UNION'.toCaseInsensitiv(), $.GroupGraphPattern))
    ),

    // [68]
    Filter: $ => seq('FILTER'.toCaseInsensitiv(), $._constraint),

    // [69]
    _constraint: $ => choice(
      $.BrackettedExpression,
      $.BuildInCall,
      $.FunctionCall
    ),

    // [70]
    FunctionCall: $ => seq(
      field('identifier', $._iri),
      $.ArgList
    ),

    // [71]
    ArgList: $ => choice(
      $.NIL,
      seq(
        '(',
        optional('DISTINCT'.toCaseInsensitiv()),
        $._expression,
        repeat(seq(',', $._expression)),
        ')'
      )
    ),

    // [72]
    ExpressionList: $ => choice(
      $.NIL,
      seq(
        '(',
        $._expression,
        repeat(seq(',', $._expression)),
        ')'
      )
    ),

    // [73]
    ConstructTemplate: $ => seq(
      '{',
      $.ConstructTriples,
      '}'
    ),

    // [74]
    ConstructTriples: $ => seq(
      $.TriplesSameSubject,
      repeat(seq(
        '.',
        $.TriplesSameSubject
      )),
      optional('.')
    ),

    // [75]
    // [76]
    // NOTE: THis is not correct! TriplesSameSubject don't support Property-Paths.
    TriplesSameSubject: $ => choice(
      seq(
        field('subject', $._var_or_term),
        $.PropertyListNotEmpty
      ),
      seq(
        $._triples_node,
        optional($.PropertyListNotEmpty)
      )
    ),

    // [77]
    PropertyListNotEmpty: $ => seq(
      field('predicate', $._VERB),
      $.ObjectList,
      repeat(seq(
        ';',
        field('predicate', $._VERB),
        $.ObjectList,
      ))
    ),

    // [78]
    _VERB: $ => choice(
      $._var_or_iri,
      'a'
    ),

    // [79]
    // [80]
    ObjectList: $ => seq(
      field('object', $._graph_node),
      repeat(seq(',', field('object', $._graph_node)))
    ),

    // [81]
    // [82]
    TriplesSameSubjectPath: $ => choice(
      seq(
        field('subject', $._var_or_term),
        $.PropertyListPathNotEmpty
      ),
      seq(
        $._triples_node_path,
        optional($.PropertyListPathNotEmpty)
      )
    ),

    // [83]
    PropertyListPathNotEmpty: $ => seq(
      field('predicate',
        choice(
          $.Path,
          $.VAR
        )
      ),
      $.ObjectList,
      repeat(seq(
        ';',
        optional(
          seq(
            field('predicate',
              choice(
                $.Path,
                $.VAR
              )
            ),
            $.ObjectList,
          )
        )
      ))
    ),

    property_path_rest: $ => seq(
      $._predicate_path,
      $.ObjectList,
    ),

    // [84]
    // [85]
    _predicate_path: $ => choice(
      $.Path,
      $.VAR
    ),

    // [86]
    // [87]
    ObjectList_path: $ => seq(
      $._graph_node_path,
      repeat(seq(',', $._graph_node_path))
    ),

    // [88]
    Path: $ => seq(
      $.PathSequence,
      repeat(
        seq(
          '|',
          $.PathSequence
        )
      )
    ),

    // [90]
    PathSequence: $ => seq(
      $.PathEltOrInverse,
      repeat(
        seq(
          '/',
          $.PathEltOrInverse
        )
      )
    ),

    // [91]
    PathElt: $ => seq(
      $.PathPrimary,
      optional($.PathMod)
    ),

    // [92]
    PathEltOrInverse: $ => seq(
      optional('^'),
      $.PathElt,
    ),

    // [93]
    PathMod: $ => choice(
      '?',
      '*',
      '+'
    ),

    // [94]
    PathPrimary: $ => choice(
      $._iri,
      'a',
      seq('!', $.PathNegatedPropertySet),
      seq('(', $.Path, ')')
    ),

    // [95]
    PathNegatedPropertySet: $ => choice(
      $.PathOneInPropertySet,
      seq(
        '(',
        optional(seq(
          $.PathOneInPropertySet,
          repeat(seq('|', $.PathOneInPropertySet)),
        )),
        ')'
      )
    ),

    // [96]
    PathOneInPropertySet: $ => choice(
      $._iri,
      'a',
      seq(
        '^',
        choice(
          $._iri,
          'a'
        )
      )
    ),

    // [98]
    _triples_node: $ => choice(
      $.collection,
      $.BlankNodePropertyListPath
    ),

    // [99]
    BlankNodePropertyList: $ => seq(
      '[',
      $.PropertyListNotEmpty,
      ']'
    ),

    // [100]
    _triples_node_path: $ => choice(
      alias($.collection_path, $.collection),
      $.BlankNodePropertyListPath
    ),

    // [101]
    BlankNodePropertyListPath: $ => seq(
      '[',
      $.PropertyListPathNotEmpty,
      ']'
    ),

    // [102]
    collection: $ => seq(
      '(',
      repeat1($._graph_node),
      ')'
    ),

    // [103]
    collection_path: $ => seq(
      '(',
      repeat1($._graph_node_path),
      ')'
    ),

    // [104]
    _graph_node: $ => choice(
      $._var_or_term,
      $._triples_node
    ),

    // [105]
    _graph_node_path: $ => choice(
      $._var_or_term,
      $._triples_node_path
    ),

    // [106]
    _var_or_term: $ => choice(
      $.VAR,
      $._graph_term
    ),

    // [107]
    _var_or_iri: $ => choice(
      $.VAR,
      $._iri,
    ),

    // [108, 143, 144, 166]
    VAR: $ => token(seq(
      choice(
        '?',
        '$'
      ),
      choice(
        ...PN_CHARS_U,
        /[0-9]/
      ),
      repeat(choice(
        ...PN_CHARS_U,
        /[0-9]/,
        /[\u00B7]/,
        /[\u0300-\u036F]/,
        /[\u203F-\u2040]/
      ))
    )),

    // [109]
    _graph_term: $ => choice(
      $._iri,
      $.RdfLiteral,
      $._numeric_literal,
      $.boolean_literal,
      $._blank_node,
      $.NIL
    ),

    _expression: $ => choice(
      $._primary_expression,
      $.unary_expression,
      $.binary_expression
    ),

    // TODO: This is not equivalent to the original grammar.
    // Here are some expressions that should not parse but do:
    // 1 > 2 > 3
    // 1 +
    // [110 - 117]
    binary_expression: $ => choice(
      // conditional
      prec.left(seq($._expression, field('operator', '||'), $._expression)),
      prec.left(1, seq($._expression, field('operator', '&&'), $._expression)),
      // relational
      prec.left(2, seq($._expression, field('operator', '='), $._expression)),
      prec.left(2, seq($._expression, field('operator', '!='), $._expression)),
      prec.left(2, seq($._expression, field('operator', '<'), $._expression)),
      prec.left(2, seq($._expression, field('operator', '>'), $._expression)),
      prec.left(2, seq($._expression, field('operator', '<='), $._expression)),
      prec.left(2, seq($._expression, field('operator', '>='), $._expression)),
      prec.left(2, seq($._expression, field('operator', 'IN'.toCaseInsensitiv()), $.ExpressionList)),
      prec.left(2, seq($._expression, field('operator', seq('NOT'.toCaseInsensitiv(), 'IN'.toCaseInsensitiv())), $.ExpressionList)),
      // numeric
      prec.left(3, seq($._expression, field('operator', '+'), $._expression)),
      prec.left(3, seq($._expression, field('operator', '-'), $._expression)),
      prec.left(4, seq($._expression, field('operator', '*'), $._expression)),
      prec.left(4, seq($._expression, field('operator', '/'), $._expression)),
    ),

    // [118]
    unary_expression: $ => choice(
      seq('!', $._primary_expression),
      seq('+', $._primary_expression),
      seq('-', $._primary_expression),
    ),

    // [119]
    _primary_expression: $ => choice(
      $.BrackettedExpression,
      $.BuildInCall,
      $._iri_or_function,
      $.RdfLiteral,
      $._numeric_literal,
      $.boolean_literal,
      $.VAR
    ),

    // [120]
    BrackettedExpression: $ => seq(
      '(',
      $._expression,
      ')'
    ),

    // [121]
    BuildInCall: $ => choice(
      $._build_in_function,
      $.Aggregate,
      $.ExistsFunc,
      $.NotExistsFunc,
      $.SubstringExpression,
      $.String_replace_expression,
      $.RegexExpression,
    ),

    _build_in_function: $ => choice(
      $._nullary_build_in_function,
      $._unary_build_in_function,
      $._binary_build_in_function,
      $._variadic_build_in_function,
      seq(
        'BOUND'.toCaseInsensitiv(),
        field('arguments', seq('(', $.VAR, ')'))),
      seq(
        'BNODE'.toCaseInsensitiv(),
        field('arguments', choice($.BrackettedExpression, $.NIL))
      ),
      seq(
        'IF'.toCaseInsensitiv(),
        field('arguments', seq('(', $._expression, ',', $._expression, ',', $._expression, ')'))),
    ),

    _nullary_build_in_function: $ => seq(
      choice(
        ...[
          'NOW',
          'RAND',
          'STRUUID',
          'UUID'
        ].map(i => i.toCaseInsensitiv())
      ),
      field('arguments', $.NIL)
    ),


    _unary_build_in_function: $ => seq(
      choice(
        ...[
          'ABS',
          'CEIL',
          'DATATYPE',
          'DAY',
          'ENCODE_FOR_URI',
          'FLOOR',
          'HOURS',
          'IRI',
          'LANG',
          'LCASE',
          'MD5',
          'MINUTES',
          'MONTH',
          'ROUND',
          'SECONDS',
          'SHA1',
          'SHA256',
          'SHA384',
          'SHA512',
          'STR',
          'STRLEN',
          'TIMEZONE',
          'TZ',
          'UCASE',
          'URI',
          'YEAR',
          'isBLANK',
          'isIRI',
          'isLITERAL',
          'isNUMERIC',
          'isURI',
        ].map(i => i.toCaseInsensitiv())
      ),
      field('arguments', $.BrackettedExpression)
    ),

    _binary_build_in_function: $ => seq(
      choice(
        ...[
          'CONTAINS',
          'LANGMATCHES',
          'STRAFTER',
          'STRBEFORE',
          'STRDT',
          'STRENDS',
          'STRLANG',
          'STRSTARTS',
          'sameTerm',
        ].map(i => i.toCaseInsensitiv())
      ),
      field('arguments', seq('(', $._expression, ',', $._expression, ')'))
    ),

    _variadic_build_in_function: $ => seq(
      choice(
        ...[
          'CONCAT',
          'COALESCE',
        ].map(i => i.toCaseInsensitiv())
      ),
      field('arguments', $.ExpressionList)
    ),

    // [122]
    RegexExpression: $ => seq(
      'REGEX'.toCaseInsensitiv(),
      seq('(',
        field('text', $._expression),
        ',',
        field('pattern', $._expression),
        optional(seq(
          ',',
          field('flag', $._expression))
        ),
        ')'
      )
    ),

    // [123]
    SubstringExpression: $ => seq(
      'SUBSTR'.toCaseInsensitiv(),
      '(',
      $._expression,
      ',',
      $._expression,
      optional(seq(',', $._expression)),
      ')'
    ),

    // [124]
    String_replace_expression: $ => seq(
      'REPLACE'.toCaseInsensitiv(),
      '(',
      $._expression,
      ',',
      $._expression,
      ',',
      $._expression,
      optional(seq(',', $._expression)),
      ')'
    ),

    // [125]
    ExistsFunc: $ => seq(
      'EXISTS'.toCaseInsensitiv(),
      $.GroupGraphPattern
    ),

    // [126]
    NotExistsFunc: $ => seq(
      'NOT'.toCaseInsensitiv(),
      'EXISTS'.toCaseInsensitiv(),
      $.GroupGraphPattern
    ),

    // [127]
    Aggregate: $ => choice(
      seq(
        'COUNT'.toCaseInsensitiv(),
        '(',
        optional('DISTINCT'.toCaseInsensitiv()),
        choice(
          '*',
          $._expression
        ),
        ')'
      ),
      seq('SUM'.toCaseInsensitiv(), '(', optional('DISTINCT'.toCaseInsensitiv()), $._expression, ')'),
      seq('MIN'.toCaseInsensitiv(), '(', optional('DISTINCT'.toCaseInsensitiv()), $._expression, ')'),
      seq('MAX'.toCaseInsensitiv(), '(', optional('DISTINCT'.toCaseInsensitiv()), $._expression, ')'),
      seq('AVG'.toCaseInsensitiv(), '(', optional('DISTINCT'.toCaseInsensitiv()), $._expression, ')'),
      seq('SAMPLE'.toCaseInsensitiv(), '(', optional('DISTINCT'.toCaseInsensitiv()), $._expression, ')'),
      seq(
        'GROUP_CONCAT'.toCaseInsensitiv(), '(',
        optional('DISTINCT'.toCaseInsensitiv()),
        $._expression,
        optional(seq(';', 'SEPARATOR'.toCaseInsensitiv(), '=', $.String)),
        ')'
      ),
    ),

    // [128]
    _iri_or_function: $ => seq(choice(
      $._iri,
      $.FunctionCall
    )),

    // [129]
    RdfLiteral: $ => seq(
      field('value', $.String),
      optional(choice(
        $.LANGTAG,
        field('datatype', seq('^^', $._iri))
      ))
    ),

    _numeric_literal: $ => choice(
      $.INTEGER,
      $.DECIMAL,
      $.DOUBLE
    ),

    // [134]
    boolean_literal: $ => choice(
      'true',
      'false'
    ),


    // [135]
    String: $ => choice(
      $.STRING_LITERAL,
      $.STRING_LITERAL_LONG,
    ),

    // [136]
    _iri: $ => choice(
      $.IRIREF,
      $.PrefixedName
    ),


    // [137]
    // [141]
    PrefixedName: $ => seq(
      $.PNAME_NS,
      optional($.PN_LOCAL)
    ),

    // [138]
    _blank_node: $ => choice(
      $.BLANK_NODE_LABEL,
      $.ANON
    ),

    // [139]
    IRIREF: $ => /<([^<>"{}|^`\\\x00-\x20])*>/,

    // [140]
    // TODO: This also accepts "namespace :", needs to be fixed!
    // NOTE: 'token.immediate' does not work here...
    PNAME_NS: $ => seq(
      optional($.PN_PREFIX),
      ':'
    ),

    // [142]
    BLANK_NODE_LABEL: $ => token(seq(
      '_:',
      choice(
        ...PN_CHARS_U,
        /[0-9]/
      ),
      optional(seq(
        repeat(choice(
          ...PN_CHARS,
          '.'
        )),
        choice(...PN_CHARS)
      ))
    )),

    // [145]
    LANGTAG: $ => token(seq(
      '@', /[a-zA-Z]+/,
      repeat(seq('-', /[a-zA-Z0-9]+/))
    )),

    // [146]
    INTEGER: $ => token(/[+-]?[0-9]+/),

    // [147]
    DECIMAL: $ => token(seq(/[+-]?/, /[0-9]*/, '.', /[0-9]+/)),

    // [148]
    DOUBLE: $ => token(seq(
      /[+-]?/,
      choice(
        seq(/[0-9]+/, '.', /[0-9]*/, seq(...EXPONENT)),
        seq('.', /[0-9]+/, seq(...EXPONENT)),
        seq(/[0-9]+/, seq(...EXPONENT))
      ))
    ),



    // NOTE: Here STRING_LITERAL1 [156] and STRING_LITERAL2 [157] is consolidated into a single token to simplify the resulting CSTs
    // NOTE: ECHAR [160] is inligned into this rule to allow token() to be used
    // [156] [157] [160]
    STRING_LITERAL: $ => seq(
      choice("'", '"'),
      repeat(choice(
        /[^\x27\x5C\x0A\x0D]/,
        /\\[tbnrf\\"']/
      )),
      choice("'", '"')
    ),

    // NOTE: Here STRING_LITERAL_LONG1 [158] and STRING_LITERAL_LONG2 [159] is consolidated into a single token to simplify the resulting CSTs
    // NOTE: ECHAR [160] is inligned into this rule to allow token() to be used
    // [158]
    STRING_LITERAL_LONG: $ => seq(
      choice("'''", '"""'),
      repeat(seq(
        optional(choice(
          "'",
          "''",
        )),
        choice(
          /[^'\\]/,
          /\\[tbnrf\\"']/
        )
      )),
      choice("'''", '"""')
    ),


    // [161]
    NIL: $ => token(seq(
      '(',
      repeat(choice(...WS)),
      ')'
    )),

    // [163]
    ANON: $ => token(seq(
      '[',
      repeat(choice(...WS)),
      ']'
    )),

    // [168]
    PN_PREFIX: $ => token(seq(
      choice(...PN_CHARS_BASE),
      optional(seq(
        repeat(choice(
          ...PN_CHARS,
          '.'
        )),
        choice(...PN_CHARS)
      ))
    )),

    // [169]
    PN_LOCAL: $ => token.immediate(seq(
      choice(
        ...PN_CHARS_U,
        ':',
        /[0-9]/,
        seq('%', choice(...HEX), choice(...HEX)),
        ...PN_LOCAL_ESC
      ),
      optional(seq(
        repeat(choice(
          ...PN_CHARS,
          '.',
          ':',
          seq('%', choice(...HEX), choice(...HEX)),
          ...PN_LOCAL_ESC
        )),
        choice(
          ...PN_CHARS,
          ':',
          seq('%', choice(...HEX), choice(...HEX)),
          ...PN_LOCAL_ESC
        )
      ))
    )),
  }
})
