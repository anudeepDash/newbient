const INDIA_DATA = {
  states: [
    {
      name: 'Andhra Pradesh',
      cities: [
        {
          name: 'Visakhapatnam',
          colleges: [
            'Andhra University',
            'GITAM University',
            'IIM Visakhapatnam',
            'Gayatri Vidya Parishad College of Engineering',
            'Other'
          ]
        },
        {
          name: 'Vijayawada',
          colleges: [
            'KL University',
            'VR Siddhartha Engineering College',
            'SRM University AP',
            'Other'
          ]
        },
        {
          name: 'Tirupati',
          colleges: [
            'IIT Tirupati',
            'Sri Venkateswara University',
            'SPMVV',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Assam',
      cities: [
        {
          name: 'Guwahati',
          colleges: [
            'IIT Guwahati',
            'Gauhati University',
            'Assam Engineering College',
            'Cotton University',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Bihar',
      cities: [
        {
          name: 'Patna',
          colleges: [
            'IIT Patna',
            'NIT Patna',
            'Patna University',
            'AIIMS Patna',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Delhi (NCT)',
      cities: [
        {
          name: 'New Delhi',
          colleges: [
            'IIT Delhi',
            'Delhi University (North Campus)',
            'Delhi University (South Campus)',
            'Jawaharlal Nehru University (JNU)',
            'Jamia Millia Islamia (JMI)',
            'NLU Delhi',
            'AIIMS Delhi',
            'IIIT Delhi',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Gujarat',
      cities: [
        {
          name: 'Ahmedabad',
          colleges: [
            'IIM Ahmedabad',
            'Gujarat University',
            'Nirma University',
            'CEPT University',
            'Other'
          ]
        },
        {
          name: 'Gandhinagar',
          colleges: [
            'IIT Gandhinagar',
            'DA-IICT',
            'Pandit Deendayal Energy University (PDEU)',
            'Other'
          ]
        },
        {
          name: 'Surat',
          colleges: [
            'SVNIT Surat',
            'Veer Narmad South Gujarat University',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Karnataka',
      cities: [
        {
          name: 'Bangalore',
          colleges: [
            'IIM Bangalore',
            'IISc Bangalore',
            'Christ University',
            'PES University',
            'RV College of Engineering (RVCE)',
            'BMS College of Engineering',
            'NLSIU Bangalore',
            'Jain University',
            'Other'
          ]
        },
        {
          name: 'Manipal',
          colleges: [
            'Manipal Institute of Technology (MIT)',
            'Kasturba Medical College (KMC)',
            'Other'
          ]
        },
        {
          name: 'Mangalore',
          colleges: [
            'NITK Surathkal',
            'Mangalore University',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Kerala',
      cities: [
        {
          name: 'Kochi',
          colleges: [
            'CUSAT',
            'Rajagiri College of Social Sciences',
            'Other'
          ]
        },
        {
          name: 'Thiruvananthapuram',
          colleges: [
            'University of Kerala',
            'CET Trivandrum',
            'IISER Thiruvananthapuram',
            'Other'
          ]
        },
        {
          name: 'Kozhikode',
          colleges: [
            'IIM Kozhikode',
            'NIT Calicut',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Maharashtra',
      cities: [
        {
          name: 'Mumbai',
          colleges: [
            'IIT Bombay',
            'Mumbai University',
            'St. Xavier\'s College',
            'NMIMS',
            'VJTI',
            'SPJIMR',
            'TISS',
            'Other'
          ]
        },
        {
          name: 'Pune',
          colleges: [
            'Savitribai Phule Pune University',
            'Symbiosis International University',
            'Fergusson College',
            'COEP Pune',
            'MIT WPU',
            'Other'
          ]
        },
        {
          name: 'Nagpur',
          colleges: [
            'VNIT Nagpur',
            'IIM Nagpur',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Punjab',
      cities: [
        {
          name: 'Chandigarh',
          colleges: [
            'Panjab University',
            'PEC Chandigarh',
            'Other'
          ]
        },
        {
          name: 'Jalandhar',
          colleges: [
            'NIT Jalandhar',
            'Lovely Professional University (LPU)',
            'Other'
          ]
        },
        {
          name: 'Amritsar',
          colleges: [
            'IIM Amritsar',
            'Guru Nanak Dev University',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Rajasthan',
      cities: [
        {
          name: 'Pilani',
          colleges: [
            'BITS Pilani',
            'Other'
          ]
        },
        {
          name: 'Jaipur',
          colleges: [
            'MNIT Jaipur',
            'Manipal University Jaipur',
            'University of Rajasthan',
            'Other'
          ]
        },
        {
          name: 'Jodhpur',
          colleges: [
            'IIT Jodhpur',
            'NLU Jodhpur',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Tamil Nadu',
      cities: [
        {
          name: 'Chennai',
          colleges: [
            'IIT Madras',
            'Anna University',
            'SRM Institute of Science and Technology',
            'Loyola College',
            'Madras Christian College',
            'SSN College of Engineering',
            'Other'
          ]
        },
        {
          name: 'Vellore',
          colleges: [
            'VIT Vellore',
            'CMC Vellore',
            'Other'
          ]
        },
        {
          name: 'Trichy',
          colleges: [
            'NIT Trichy',
            'IIM Trichy',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Telangana',
      cities: [
        {
          name: 'Hyderabad',
          colleges: [
            'IIT Hyderabad',
            'IIIT Hyderabad',
            'BITS Pilani Hyderabad',
            'Osmania University',
            'University of Hyderabad',
            'NALSAR University of Law',
            'JNTU Hyderabad',
            'Other'
          ]
        },
        {
          name: 'Warangal',
          colleges: [
            'NIT Warangal',
            'Kakatiya University',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'Uttar Pradesh',
      cities: [
        {
          name: 'Kanpur',
          colleges: [
            'IIT Kanpur',
            'HBTU Kanpur',
            'Other'
          ]
        },
        {
          name: 'Noida / Greater Noida',
          colleges: [
            'Amity University',
            'Shiv Nadar University',
            'Jaypee Institute of Information Technology (JIIT)',
            'Galgotias University',
            'Other'
          ]
        },
        {
          name: 'Lucknow',
          colleges: [
            'IIM Lucknow',
            'Lucknow University',
            'Other'
          ]
        },
        {
          name: 'Varanasi',
          colleges: [
            'IIT BHU',
            'Banaras Hindu University (BHU)',
            'Other'
          ]
        },
        {
          name: 'Aligarh',
          colleges: [
            'Aligarh Muslim University (AMU)',
            'Other'
          ]
        }
      ]
    },
    {
      name: 'West Bengal',
      cities: [
        {
          name: 'Kolkata',
          colleges: [
            'IIM Calcutta',
            'Jadavpur University',
            'Calcutta University',
            'St. Xavier\'s College Kolkata',
            'Presidency University',
            'Other'
          ]
        },
        {
          name: 'Kharagpur',
          colleges: [
            'IIT Kharagpur',
            'Other'
          ]
        },
        {
          name: 'Durgapur',
          colleges: [
            'NIT Durgapur',
            'Other'
          ]
        }
      ]
    }
  ]
};

export default INDIA_DATA;
