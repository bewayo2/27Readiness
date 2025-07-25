import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Container,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  TextField,
  LinearProgress,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const questions = [
  {
    section: 'Management Commitment and Context',
    items: [
      'Has top management formally committed to implementing and supporting an Information Security Management System (ISMS)?',
      "Are the organization's objectives for information security clearly defined and aligned with business goals?",
      'Has the scope of the ISMS been clearly documented (including boundaries, exclusions, and context)?',
      'Is there a clear assignment of roles and responsibilities for information security?',
      'Has the organization identified and documented relevant internal and external issues that affect information security?',
      'Are interested parties (stakeholders) and their information security requirements identified and documented?'
    ]
  },
  {
    section: 'ISMS Policy and Documentation',
    items: [
      'Is there a formally documented information security policy approved by management?',
      'Is the policy communicated to all employees and relevant external parties?',
      'Is the policy reviewed and updated regularly?',
      'Are procedures, guidelines, and records documented, accessible, and controlled?',
      'Is there a document control process in place?'
    ]
  },
  {
    section: 'Risk Assessment and Treatment',
    items: [
      'Is there a defined risk assessment methodology?',
      'Are information security risks identified, analyzed, and evaluated regularly?',
      'Are asset inventories (information, hardware, software, people, etc.) maintained?',
      'Are threats and vulnerabilities assessed for each asset?',
      'Is there a risk treatment plan that specifies how risks will be managed (mitigated, avoided, transferred, or accepted)?',
      'Are controls selected based on the results of risk assessment and documented in a Statement of Applicability (SoA)?',
      'Are residual risks reviewed and accepted by management?'
    ]
  },
  {
    section: 'Information Security Controls (Annex A Reference) - Organizational Controls',
    items: [
      'Are roles and responsibilities for information security clearly assigned?',
      'Is there a disciplinary process for security breaches?',
      'Are background checks performed on employees?',
      'Are all users aware of their responsibilities regarding information security?'
    ]
  },
  {
    section: 'Asset Management',
    items: [
      'Is there an up-to-date inventory of all information assets?',
      'Are ownership and classification of information assets defined?',
      'Are processes in place for the acceptable use and disposal of assets?'
    ]
  },
  {
    section: 'Access Control',
    items: [
      'Are user access rights granted based on business need and reviewed regularly?',
      'Are authentication mechanisms (passwords, MFA, etc.) enforced?',
      'Is there a process for user registration, de-registration, and privilege management?'
    ]
  },
  {
    section: 'Cryptography',
    items: [
      'Are encryption policies and practices documented and followed?',
      'Are cryptographic keys securely managed?'
    ]
  },
  {
    section: 'Physical and Environmental Security',
    items: [
      'Are physical entry controls in place to secure information processing facilities?',
      'Are equipment and media protected from unauthorized access and environmental threats?'
    ]
  },
  {
    section: 'Operations Security',
    items: [
      'Are operating procedures documented and communicated?',
      'Are system logs collected, monitored, and protected?',
      'Is malware protection implemented and updated?',
      'Are backup processes in place and tested regularly?'
    ]
  },
  {
    section: 'Communications Security',
    items: [
      'Are networks managed and protected?',
      'Is information transferred securely both internally and externally?'
    ]
  },
  {
    section: 'System Acquisition, Development, and Maintenance',
    items: [
      'Is information security integrated into project management and system development?',
      'Are vulnerabilities in software and systems identified and addressed?'
    ]
  },
  {
    section: 'Supplier Relationships',
    items: [
      'Are suppliers evaluated for their information security practices?',
      'Are information security requirements included in supplier agreements?'
    ]
  },
  {
    section: 'Information Security Incident Management',
    items: [
      'Is there an incident management policy and procedure?',
      'Are incidents reported, recorded, and investigated promptly?',
      'Are lessons learned from incidents used to improve controls?'
    ]
  },
  {
    section: 'Business Continuity',
    items: [
      'Are information security aspects considered in business continuity planning?',
      'Are continuity and recovery plans tested and reviewed?'
    ]
  },
  {
    section: 'Compliance',
    items: [
      'Are legal, regulatory, and contractual requirements identified and documented?',
      'Are regular reviews conducted to ensure compliance with relevant laws and standards?',
      'Are records of processing activities maintained as required by privacy/data protection regulations?'
    ]
  },
  {
    section: 'Monitoring and Measurement',
    items: [
      'Are controls regularly monitored and measured for effectiveness?',
      'Are internal audits of the ISMS performed according to a planned schedule?',
      'Is there a management review process for the ISMS?',
      'Are corrective and preventive actions taken to address non-conformities?'
    ]
  },
  {
    section: 'Continual Improvement',
    items: [
      'Is there a formal process for continual improvement of the ISMS?',
      'Are improvement opportunities identified through monitoring, audits, incidents, and feedback?',
      'Are changes to the ISMS documented and communicated?'
    ]
  }
];

const scoringLabels = [
  '0 – Not Implemented',
  '1 – Partially Implemented',
  '2 – Mostly Implemented',
  '3 – Fully Implemented'
];

function flattenQuestions(questions) {
  const flat = [];
  questions.forEach(section => {
    section.items.forEach(item => {
      flat.push({ section: section.section, question: item });
    });
  });
  return flat;
}

const flatQuestions = flattenQuestions(questions);

function App() {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState(flatQuestions.map(q => ({ ...q, score: '', comment: '' })));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scoreResult, setScoreResult] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);

  const handleScoreChange = (val) => {
    const updated = [...responses];
    updated[step].score = val;
    setResponses(updated);
  };

  const handleCommentChange = (e) => {
    const updated = [...responses];
    updated[step].comment = e.target.value;
    setResponses(updated);
  };

  const handleNext = () => {
    if (responses[step].score === '') {
      setError('Please select a score.');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleRestart = () => {
    setStep(0);
    setResponses(flatQuestions.map(q => ({ ...q, score: '', comment: '' })));
    setScoreResult(null);
    setSummaryResult(null);
    setError('');
  };

  const handleGetResults = async () => {
    setLoading(true);
    setError('');
    setScoreResult(null);
    setSummaryResult(null);
    try {
      const answers = responses.map(r => ({ question: r.question, answer: scoringLabels[r.score], comment: r.comment }));
      const [scoreRes, summaryRes] = await Promise.all([
        axios.post('/api/score', { responses: answers }),
        axios.post('/api/summarize', { responses: answers })
      ]);
      setScoreResult(scoreRes.data.result);
      setSummaryResult(summaryRes.data.result);
    } catch (err) {
      setError('Error contacting server.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const wsData = [
      ['#', 'Section', 'Question', 'Score (0-3)', 'Comment'],
      ...responses.map((r, i) => [i + 1, r.section, r.question, r.score, r.comment])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assessment');
    XLSX.writeFile(wb, 'iso27001-assessment.xlsx');
  };

  const progress = Math.round((step / flatQuestions.length) * 100);

  if (step >= flatQuestions.length) {
    // Results page
    return (
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h4" gutterBottom>Assessment Complete</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGetResults}
            disabled={loading || scoreResult}
            sx={{ mt: 2 }}
          >
            Get Results
          </Button>
          {loading && <Box sx={{ mt: 2 }}><CircularProgress /></Box>}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {scoreResult && (
            <Box className="results" sx={{ mt: 4, textAlign: 'left' }}>
              <Typography variant="h6">Scoring Table</Typography>
              <Box component="pre" sx={{ background: '#f5f5f5', p: 2, borderRadius: 2, overflow: 'auto' }}>{scoreResult}</Box>
              <Button variant="outlined" onClick={handleExportExcel} sx={{ mt: 2 }}>Export to Excel</Button>
            </Box>
          )}
          {summaryResult && (
            <Box className="summary" sx={{ mt: 4, textAlign: 'left' }}>
              <Typography variant="h6">Summary</Typography>
              <Typography>{summaryResult}</Typography>
            </Box>
          )}
          <Button onClick={handleRestart} sx={{ mt: 4 }}>Restart Assessment</Button>
        </Card>
      </Container>
    );
  }

  const q = flatQuestions[step];
  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Card sx={{ p: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
            ISO 27001 Readiness Assessment
          </Typography>
          <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
            <Step key={q.section}>
              <StepLabel></StepLabel>
            </Step>
          </Stepper>
          <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
          <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
            {q.section}
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Q{step + 1}: {q.question}
          </Typography>
          <RadioGroup
            value={responses[step].score}
            onChange={e => handleScoreChange(e.target.value)}
            sx={{ mb: 2 }}
          >
            {scoringLabels.map((label, idx) => (
              <FormControlLabel
                key={idx}
                value={String(idx)}
                control={<Radio />}
                label={label}
              />
            ))}
          </RadioGroup>
          <TextField
            label="Comments or Evidence (optional)"
            multiline
            minRows={3}
            fullWidth
            value={responses[step].comment}
            onChange={handleCommentChange}
            sx={{ mb: 2 }}
          />
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button onClick={handleBack} disabled={step === 0} variant="outlined">Back</Button>
            <Button onClick={handleNext} variant="contained">
              {step === flatQuestions.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Question {step + 1} of {flatQuestions.length}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}

export default App;
