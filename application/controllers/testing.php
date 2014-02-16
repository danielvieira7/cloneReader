<?php 
class Testing extends CI_Controller {

	function __construct() {
		parent::__construct();	
		
		$this->load->model(array('Testing_Model', 'Countries_Model'));
	}  
	
	function index() {
		$this->listing();
	}
	
	function listing() {
		if (! $this->safety->allowByControllerName(__METHOD__) ) { return errorForbidden(); }
		
		$page = (int)$this->input->get('page');
		if ($page == 0) { $page = 1; }
		
		$query = $this->Testing_Model->selectToList(PAGE_SIZE, ($page * PAGE_SIZE) - PAGE_SIZE, $this->input->get('filter'), $this->input->get('countryId'));
				
		$this->load->view('includes/template', array(
			'view'			=> 'includes/crList', 
			'title'			=> 'Edit testing',
			'list'			=> array(
				'controller'	=> strtolower(__CLASS__),
				'columns'		=> array('testName' => 'Name', 'countryName' => 'Country', 'stateName' => 'State'),
				'data'			=> $query->result_array(),
				'foundRows'		=> $query->foundRows,
				'filters'		=> array(
					'countryId' => array(
						'type'				=> 'dropdown',
						'label'				=> 'Country', 
						'value'				=> $this->input->get('countryId'),
						'source'			=> array_to_select($this->Countries_Model->select(), 'countryId', 'countryName'),
						'appendNullOption' 	=> true
					)
				)
			)
		));
	}
	
	function edit($testId) {
		if (! $this->safety->allowByControllerName(__METHOD__) ) { return errorForbidden(); }
		
		$form = array(
			'frmId'		=> 'frmTestingEdit',
			'fields'	=> array(
				'testId' => array(
					'type' 		=> 'hidden',
					'value'		=> (int)$testId,
				),
				'testName' => array(
					'type'	=> 'text',
					'label'	=> 'Name', 
				),
				'countryId' => array(
					'type'		=> 'dropdown',
					'label'		=> 'Country', 
					'source'	=> array_to_select($this->Countries_Model->select(), 'countryId', 'countryName'),
				),
				'stateId' => array(
					'type'			=> 'dropdown',
					'label'			=> 'State', 
					'controller'	=> base_url('testing/selectStatesByCountryId/'),
					'subscribe'		=> array(
						array(					
							'field' 		=> 'countryId',
							'event'			=> 'change',   
							'callback'		=> 'loadDropdown',
							'arguments'		=> array(
								'this.getFieldByName(\'countryId\').val()'
							),
							'runOnInit'		=> true
						)
					)
				),
				'testRating' => array(
					'type'	=> 'raty',
					'label'	=> 'Rating', 
				),
				'testDesc' => array(
					'type'	=> 'textarea',
					'label'	=> 'Description', 
				),
				'testDate' => array(
					'type'	=> 'datetime',
					'label'	=> 'Fecha', 
				),				
			)
		);
		
		if ((int)$testId > 0) {
			$form['urlDelete'] = base_url('testing/delete/');
			
			$form['fields']['gallery'] = array(
				'type'			=> 'gallery',
				'label'			=> 'Pictures',
				'urlGet' 		=> base_url('files/testing/'.$testId),
				'urlSave' 		=> base_url('files/save'),
				'entityName'	=> 'testing',
				'entityId'		=> $testId
			);
			
			$form['fields']['test_childs'] = array(
				'type'			=> 'subform',
				'label'			=> 'childs', 
				'controller'	=> base_url('testing/selectChildsByTestId/'.$testId),
				'frmParent'		=> 'frmTestingEdit',
			);						
		}
		
		$form['rules'] 	= array( 
			array(
				'field' => 'testName',
				'label' => $form['fields']['testName']['label'],
				'rules' => 'required'
			)
		);		

		$this->form_validation->set_rules($form['rules']);

		if ($this->input->post() != false) {
			$code = $this->form_validation->run();
			if ($code == true) {
				$this->Testing_Model->save($this->input->post());
			}
		}
				
		if ($this->input->is_ajax_request()) {
			return $this->load->view('ajax', array(
				'code'		=> $code, 
				'result' 	=> validation_errors() 
			));
		}
				
		$this->load->view('includes/template', array(
			'view'		=> 'includes/crForm', 
			'title'		=> 'Edit testing',
			'form'		=> populateCrForm($form, $this->Testing_Model->get($testId)),
				  
		));		
	}

	function add(){
		$this->edit(0);
	}
	
	function delete() {
		if (! $this->safety->allowByControllerName('testing/edit') ) { return errorForbidden(); }
		
		return $this->load->view('ajax', array(
			'code'		=> $this->Testing_Model->delete($this->input->post('testId')), 
			'result' 	=> validation_errors() 
		));		
	}	
	
	function selectStatesByCountryId($countryId) { // TODO: centralizar en otro lado!
		$this->load->model('States_Model');
	
		return $this->load->view('ajax', array(
			'result' => $this->States_Model->selectStatesByCountryId($countryId)
		));
	}

	function selectChildsByTestId($testId) {
		if (! $this->safety->allowByControllerName('testing/edit') ) { return errorForbidden(); }
			
		$this->load->view('ajax', array(
			'view'		=> 'includes/subform',
			'code'		=> true,
			'list'		=> array(
				'controller'	=> strtolower(__CLASS__).'/popupTestingChilds/'.$testId.'/',
				'columns'		=> array( 
					'testChildName' 	=> 'Name', 
					'countryName' 		=> 'Country', 
					'testChildDate' 	=> array('class' => 'datetime', 'value' => $this->lang->line('Date')) ),
				'data'			=> $this->Testing_Model->selectChildsByTestId($testId),
				'frmParent'		=> $this->input->get('frmParent'),
			),
		));		
	}
	
	
	
	function popupTestingChilds($testId, $testChildId) {
		if (! $this->safety->allowByControllerName('testing/edit') ) { return errorForbidden(); }
		
		$form = array(
			'frmId'		=> 'frmTestChildEdit',
			'isSubForm' => true,
			'title'		=> 'Edit test child',
			'fields'	=> array(
				'testChildId' => array(
					'type' 	=> 'text',
					'value'	=> (int)$testChildId
				),
				'testId' => array(
					'type' 	=> 'text',
					'value'	=> (int)$testId
				),
				'testChildName' => array(
					'type'		=> 'text',
					'label'		=> $this->lang->line('Name'),
				),				
				'countryId' => array(
					'type'		=> 'dropdown',
					'label'		=> 'Country',
					'source'	=> array_to_select($this->Countries_Model->select(), 'countryId', 'countryName')
				),
				'testChildDate' => array(
					'type'	=> 'datetime',
					'label'	=> $this->lang->line('Date'), 
				),
			),
			'rules' 	=> array(
				array(
					'field' => 'testChildName',
					'label' => $this->lang->line('Name'),
					'rules' => 'required'				
				),			
				array(
					'field' => 'testChildDate',
					'label' => $this->lang->line('Date'),
					'rules' => 'required'
				),
			)
		);
		
		$price 		= array('name' => 'testChildPrice', 		'label' => $this->lang->line('Price'), 	);
		$exchange 	= array('name' => 'testChildExchange',	'label' => $this->lang->line('Exchange rate'), 	);
		
		$form['fields'] += getCrFormFieldMoney(
			$price,
			array('name' => 'currencyId', 				'label' => $this->lang->line('Currency'), ),
			$exchange,
			array('name' => 'testChildTotalPrice', 	'label' => 'Total')
		);
		
		$form['rules'] 		= array_merge($form['rules'], getCrFormValidationFieldMoney($price, $exchange));		
		
		if ((int)$testChildId > 0) {
			$form['urlDelete'] = base_url('testing/deleteTestChild/');
		}
		

		$this->form_validation->set_rules($form['rules']);

		if ($this->input->post() != false) {
			$code = $this->form_validation->run();
			if ($code == true) {
				$this->Testing_Model->saveTestingChilds($this->input->post());
			}
			
			return $this->load->view('ajax', array(
				'code'		=> $code, 
				'result' 	=> validation_errors()  
			));
		}
		
		$this->load->view('ajax', array(
			'view'			=> 'includes/crPopupForm',
			'form'			=> populateCrForm($form, $this->Testing_Model->getTestChild($testChildId)),
			'code'			=> true
		));
	}	
}