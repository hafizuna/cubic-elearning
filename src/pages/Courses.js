import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import OfflineContext from '../context/OfflineContext';
import { DiscountContext } from '../context/DiscountContext';
import { showNotification } from '../components/NotificationManager';
import DiscountPopup from '../components/DiscountPopup';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Use the offline and discount contexts
  const { isOnline, offlineCourses, downloadCourse, removeOfflineCourse, isDownloading } = useContext(OfflineContext);
  const { discountStatus, applyDiscountToPurchase } = useContext(DiscountContext);

  // Fetch courses from API or use offline courses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (isOnline) {
          // If online, fetch from API
          console.log('Online: Fetching courses from API');
          const [coursesData, purchasedCoursesData] = await Promise.all([
            coursesAPI.getAllCourses(),
            coursesAPI.getPurchasedCourses()
          ]);
          
          setCourses(coursesData);
          setPurchasedCourses(purchasedCoursesData);
        } else {
          // If offline, use the offline courses from context
          console.log('Offline: Using courses from IndexedDB', offlineCourses);
          setCourses(offlineCourses);
          // All offline courses are considered purchased
          setPurchasedCourses(offlineCourses);
          
          if (offlineCourses.length === 0) {
            setError('No courses available offline. Please connect to the internet to download courses.');
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        
        if (!isOnline && offlineCourses.length > 0) {
          // If offline but we have offline courses, use them
          setCourses(offlineCourses);
          setPurchasedCourses(offlineCourses);
        } else {
          setError('Failed to load courses. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOnline, offlineCourses]);

  const handlePurchase = async (course) => {
    if (isOnline) {
      try {
        setActionInProgress(true);
        
        // Check if user has a discount to apply
        let discountApplied = false;
        let finalPrice = course.price || 0;
        
        if (discountStatus.nextCourseDiscount > 0) {
          // Apply discount to purchase
          const discountResult = await applyDiscountToPurchase(course._id);
          
          if (discountResult.success) {
            discountApplied = true;
            finalPrice = discountResult.finalPrice;
          }
        }
        
        // Purchase the course
        const purchaseResult = await coursesAPI.purchaseCourse(course._id);
        
        // Show appropriate notification
        if (discountApplied) {
          showNotification(
            `Course '${course.title}' purchased successfully with a ${discountStatus.nextCourseDiscount}% discount! You paid $${finalPrice.toFixed(2)} instead of $${course.price.toFixed(2)}`, 
            'achievement'
          );
        } else {
          // Show a simple notification
          showNotification(
            `Course '${course.title}' purchased successfully!`, 
            'achievement'
          );
          
          // Show the discount popup instead of the second notification
          setShowDiscountPopup(true);
        }
        
        // Refresh purchased courses
        const purchasedCoursesData = await coursesAPI.getPurchasedCourses();
        setPurchasedCourses(purchasedCoursesData);
      } catch (error) {
        console.error('Error purchasing course:', error);
        showNotification('Failed to purchase course. Please try again.', 'download');
      } finally {
        setActionInProgress(false);
      }
    } else {
      showNotification('You need to be online to purchase courses', 'download');
    }
  };
  
  const handleDownload = async (course) => {
    if (isOnline) {
      setActionInProgress(true);
      await downloadCourse(course);
      setActionInProgress(false);
    } else {
      showNotification('You need to be online to download new courses', 'download');
    }
  };
  
  const handleRemoveDownload = async (courseId, title) => {
    if (window.confirm(`Are you sure you want to remove ${title} from offline storage? You will need to download it again to access it offline.`)) {
      setActionInProgress(true);
      await removeOfflineCourse(courseId);
      setActionInProgress(false);
    }
  };

  const isDownloaded = (courseId) => {
    return offlineCourses.some(course => course._id === courseId);
  };
  
  const isPurchased = (courseId) => {
    return purchasedCourses.some(course => course._id === courseId);
  };

  return (
    <div className="courses-page">
      <h1>Available Courses</h1>
      
      {!isOnline && (
        <div className="card">
          <p><strong>You are currently offline.</strong> Only downloaded courses will be available.</p>
          {offlineCourses.length === 0 && (
            <p className="error-message">No courses have been downloaded for offline use. Connect to the internet to download courses.</p>
          )}
        </div>
      )}
      
      {loading ? (
        <div className="loading">Loading courses...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => (
            <div key={course._id} className="card course-card">
              {isDownloaded(course._id) && <div className="downloaded-badge">Available Offline</div>}
              <img src={course.image || `https://via.placeholder.com/300x160?text=${encodeURIComponent(course.title)}`} alt={course.title} className="course-image" />
              <h3>{course.title}</h3>
              <div className="course-price">${course.price || 0}</div>
              <p>{course.description}</p>
              <p><strong>{course.lessons?.length || 0} Lessons</strong></p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Link to={`/courses/${course._id}`} className="btn btn-primary">
                  {isDownloaded(course._id) ? 'Continue Learning' : 'View Course'}
                </Link>
                
                {!isPurchased(course._id) ? (
                  <div className="purchase-container">
                    <button 
                      className="purchase-btn" 
                      onClick={() => handlePurchase(course)}
                      disabled={!isOnline || actionInProgress}
                    >
                      {actionInProgress ? 'Processing...' : 'Purchase'}
                    </button>
                    {discountStatus.nextCourseDiscount > 0 && (
                      <div className="discount-badge">
                        {discountStatus.nextCourseDiscount}% OFF
                      </div>
                    )}
                  </div>
                ) : !isDownloaded(course._id) ? (
                  <button 
                    className="download-btn" 
                    onClick={() => handleDownload(course)}
                    disabled={!isOnline || actionInProgress}
                  >
                    {actionInProgress ? 'Downloading...' : 'Download for Offline'}
                  </button>
                ) : (
                  <button 
                    className="remove-download-btn" 
                    onClick={() => handleRemoveDownload(course._id, course.title)}
                    disabled={actionInProgress}
                  >
                    Remove Download
                  </button>
                )}
              </div>
            </div>
        ))}
        </div>
      )}
      
      {/* Discount Popup */}
      <DiscountPopup 
        show={showDiscountPopup} 
        onClose={() => setShowDiscountPopup(false)} 
        discountAmount={30}
      />
    </div>
  );
};

export default Courses;
